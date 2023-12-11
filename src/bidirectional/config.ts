import type { RelationshipField } from "payload/dist/exports/types";
import {
  AllRelationships,
  FieldAndPath,
  RelationshipEnhancement,
  biDirectionalLookups,
} from "../types";

type ConfigType = {
  relationTo: string;
  path: string;
};

const getConfig = (
  configs: ConfigType[],
  collection: string
): ConfigType | null => {
  for (const item of configs) {
    if (item.relationTo === collection) {
      return item;
    }
  }

  return null;
};

export const getBiDirectionalConfig = (
  biDirectionalConfig: biDirectionalLookups,
  relationshipsToEnhance: FieldAndPath[],
  collectionSlug: string,
  allRelationships: AllRelationships
) => {
  for (const relationship of relationshipsToEnhance) {
    const config = relationship.field.custom as RelationshipEnhancement;

    if (config.relationshipEnhancer.biDirectional) {
      const rel = relationship.field as RelationshipField;
      let useArr = [];
      let polymorphic = false;

      if (!Array.isArray(rel.relationTo)) {
        useArr = [rel.relationTo];
      } else {
        useArr = rel.relationTo;
        polymorphic = true;
      }

      // useArr has all of the collections that the relation in collection has to update
      for (const relationCollection of useArr) {
        const itemConfig = getConfig(
          // @ts-ignore
          config.relationshipEnhancer.biDirectional,
          relationCollection
        );

        if (itemConfig === null) {
          // this means we were not able to find a config for a relation that has been specified in the relationTo field,
          // this can be ok for example polymorphic relationships where we don't want all of them
          // to be bi-directional, but it could also be a fat finger thats hard to debug
          console.error(
            `Relationship Enhancer could not load a bi-directional relation for ${relationCollection} on field ${relationship.path}`
          );

          break;
        }

        if (!biDirectionalConfig[collectionSlug]) {
          biDirectionalConfig[collectionSlug] = {};
        }

        if (
          !biDirectionalConfig[collectionSlug][
            relationship.path + "_" + collectionSlug
          ]
        ) {
          biDirectionalConfig[collectionSlug][
            relationship.path + "_" + collectionSlug
          ] = {
            targets: [],
            triggerCollection: {
              collectionSlug,
              fieldPath: relationship.path,
              polymorphic,
              hasMany: rel.hasMany === undefined ? false : rel.hasMany,
              relationCollections: useArr,
            },
          };
        }

        // we need to find the corresponding side of this relationship
        let targetHasMany: null | boolean = null;
        let targetPolymorphic: null | boolean = null;
        let targetRelationCollections: null | Array<string> = null;

        for (const collectionSlugKey in allRelationships) {
          if (collectionSlugKey === itemConfig.relationTo) {
            const relationships = allRelationships[collectionSlugKey];

            for (const relationship of relationships) {
              if (relationship.path === itemConfig.path) {
                const rel = relationship.field as RelationshipField;

                targetHasMany = rel.hasMany === undefined ? false : rel.hasMany;
                targetPolymorphic = Array.isArray(rel.relationTo);
                targetRelationCollections = Array.isArray(rel.relationTo)
                  ? rel.relationTo
                  : [rel.relationTo];
              }
            }
          }
        }

        // of that failed return null and handle in caller
        if (
          targetHasMany === null ||
          targetPolymorphic === null ||
          targetRelationCollections === null
        ) {
          return null;
        }

        // set the final target data
        biDirectionalConfig[collectionSlug][
          relationship.path + "_" + collectionSlug
        ].targets.push({
          collectionSlug: itemConfig.relationTo,
          fieldPath: itemConfig.path,
          hasMany: targetHasMany,
          polymorphic: targetPolymorphic,
          relationCollections: targetRelationCollections,
          relationCollectionsConfigCopy: {},
        });
      }
    }
  }
};

// we make the config circular so that it is possible to reference deep as deeded
export const enhanceBiDirectionalConfig = (
  biDirectionalConfig: biDirectionalLookups
) => {
  // we go to the targets for each config item
  for (const collectionSlugKey in biDirectionalConfig) {
    const collectionConfig = biDirectionalConfig[collectionSlugKey];

    for (const fieldKey in collectionConfig) {
      const fieldConfig = collectionConfig[fieldKey];

      for (const target of fieldConfig.targets) {
        for (const relation of target.relationCollections) {
          // and now we have a target, we go and grab the config for the corresponding fields of the relation
          // we do this to nest the config so that we have easy access to it at the lower levels.

          if (
            biDirectionalConfig[target.collectionSlug] &&
            biDirectionalConfig[target.collectionSlug][
              target.fieldPath + "_" + target.collectionSlug
            ]
          ) {
            const targets =
              biDirectionalConfig[target.collectionSlug][
                target.fieldPath + "_" + target.collectionSlug
              ].targets;

            for (const t of targets) {
              if (t.collectionSlug === relation) {
                // break cyclic relationship - ?
                // target.relationCollectionsConfigCopy![relation] = JSON.parse(
                //   JSON.stringify(t)
                // );
                target.relationCollectionsConfigCopy![relation] = t;
              }
            }
          }
        }
      }
    }
  }
};

// TODO this need to be better?
export const checkBiDirectionalConfig = (config: biDirectionalLookups) => {
  let error = false;

  for (const key in config) {
    const collectionConfig = config[key];

    for (const innerKey in collectionConfig) {
      const relationConfig = collectionConfig[innerKey];

      if (
        relationConfig.targets.length !=
        relationConfig.triggerCollection.relationCollections.length
      ) {
        console.error(
          "Relation Enhancer config error",
          `${relationConfig.triggerCollection.collectionSlug}:${relationConfig.triggerCollection.fieldPath}`,
          `has targets to ${relationConfig.targets.length} collections but is related to ${relationConfig.triggerCollection.relationCollections.length} collections`
        );
        error = true;
      }

      for (const target of relationConfig.targets) {
        const lookup = target.fieldPath + "_" + target.collectionSlug;

        if (
          !config[target.collectionSlug] ||
          !config[target.collectionSlug][lookup]
        ) {
          console.error(
            "Relation Enhancer config error",
            `${relationConfig.triggerCollection.collectionSlug}:${relationConfig.triggerCollection.fieldPath}`,
            "does not have a matching config in",
            `${target.collectionSlug}:${target.fieldPath}`
          );
          error = true;
          break;
        }
      }
    }
  }

  return error;
};
