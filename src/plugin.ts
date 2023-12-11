import { Config, Plugin } from "payload/config";
import { getAfterChangeHook } from "./bidirectional/bidirectional";

import {
  checkBiDirectionalConfig,
  enhanceBiDirectionalConfig,
  getBiDirectionalConfig,
} from "./bidirectional/config";
import { getRelationalIntegrityConfig } from "./relationshipintegrity/config";
import { getAfterDeleteHook } from "./relationshipintegrity/relationshipintegrity";
import {
  AllRelationships,
  RelationalIntegrityLookups,
  biDirectionalLookups,
} from "./types";
import { extractRelationships } from "./util";

const RelationshipEnhancerPlugin: Plugin = (incomingConfig: Config): Config => {
  console.log("Starting Relationship Enhancement Plugin");

  if (!incomingConfig.collections) {
    return incomingConfig;
  }

  if (!incomingConfig.db.toString().includes('name: "mongoose"')) {
    console.error(
      "Relationship Enhancer currently only supports Mongo/Mongoose, plugin not started!"
    );

    return incomingConfig;
  }

  // configs
  const relationalIntegrityConfig: RelationalIntegrityLookups = {};
  const biDirectionalConfig: biDirectionalLookups = {};

  const allRelationships: AllRelationships = {};

  for (const collection of incomingConfig.collections!) {
    const relationshipsToEnhance = extractRelationships(collection);
    allRelationships[collection.slug] = relationshipsToEnhance;
  }

  for (const collection of incomingConfig.collections!) {
    const relationshipsToEnhance = allRelationships[collection.slug];

    getRelationalIntegrityConfig(
      relationalIntegrityConfig,
      relationshipsToEnhance,
      collection.slug
    );

    const test = getBiDirectionalConfig(
      biDirectionalConfig,
      relationshipsToEnhance,
      collection.slug,
      allRelationships
    );

    // TODO this should go to the config checker and remove logic inside of biDirectionalConfig
    if (test === null) {
      console.error(
        `Relataionship Enhancer could not initialise because of a config error, missing corresponding field for a bi directional relationship`
      );
      return incomingConfig;
    }
  }

  enhanceBiDirectionalConfig(biDirectionalConfig);

  const configErrors = checkBiDirectionalConfig(biDirectionalConfig);

  if (configErrors === true) {
    console.error("Relation Enhancer did not initialise, fix config errors");
    return incomingConfig;
  }

  const config: Config = {
    ...incomingConfig,
    collections: incomingConfig.collections.map((collection) => {
      // put any relational integrity related hooks on
      if (relationalIntegrityConfig[collection.slug]) {
        const afterDeleteHook = getAfterDeleteHook(
          relationalIntegrityConfig[collection.slug],
          collection
        );

        if (!collection.hooks) {
          collection.hooks = {};
        }

        if (!collection.hooks.afterDelete) {
          collection.hooks.afterDelete = [afterDeleteHook];
        } else {
          collection.hooks.afterDelete.push(afterDeleteHook);
        }
      }

      // put any bi directional related hooks on
      if (biDirectionalConfig[collection.slug]) {
        const afterChangeHook = getAfterChangeHook(
          biDirectionalConfig[collection.slug],
          collection
        );

        if (!collection.hooks) {
          collection.hooks = {};
        }

        if (!collection.hooks.afterChange) {
          collection.hooks.afterChange = [afterChangeHook];
        } else {
          collection.hooks.afterChange.push(afterChangeHook);
        }
      }

      return collection;
    }),
  };

  return config;
};

export { RelationshipEnhancerPlugin };
