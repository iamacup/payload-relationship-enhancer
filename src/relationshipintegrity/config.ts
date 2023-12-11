import { RelationshipField } from "payload/dist/exports/types";
import {
  FieldAndPath,
  RelationalIntegrityLookups,
  RelationshipEnhancement,
} from "../types";

const getRelationalIntegrityConfig = (
  relationalIntegrityConfig: RelationalIntegrityLookups,
  relationshipsToEnhance: FieldAndPath[],
  collectionSlug: string
) => {
  for (const relationship of relationshipsToEnhance) {
    const config = relationship.field.custom as RelationshipEnhancement;

    if (
      config.relationshipEnhancer.relationshipIntegrity &&
      config.relationshipEnhancer.relationshipIntegrity === true
    ) {
      const rel = relationship.field as RelationshipField;
      let useArr = [];
      let polymorphic = false;

      if (!Array.isArray(rel.relationTo)) {
        useArr = [rel.relationTo];
      } else {
        useArr = rel.relationTo;
        polymorphic = true;
      }

      for (const relationCollection of useArr) {
        if (!relationalIntegrityConfig[relationCollection]) {
          relationalIntegrityConfig[relationCollection] = {};
        }

        if (
          !relationalIntegrityConfig[relationCollection][
            relationship.path + "_" + collectionSlug
          ]
        ) {
          relationalIntegrityConfig[relationCollection][
            relationship.path + "_" + collectionSlug
          ] = {
            path: relationship.path,
            collectionSlug,
            polymorphic,
            hasMany: rel.hasMany === undefined ? false : rel.hasMany,
          };
        }
      }
    }
  }
};

export { getRelationalIntegrityConfig };
