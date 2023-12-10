import type {
  CollectionAfterDeleteHook,
  CollectionConfig,
} from "payload/dist/exports/types";
import { RelationalIntegrityLookupsPathSpecifics } from "../../types";
import { executeBatchQuery, unsetReferencedIDInCollection } from "../database";

const getAfterDeleteHook = (
  relationalIntegrity: RelationalIntegrityLookupsPathSpecifics,
  collection: CollectionConfig
) => {
  const afterDeleteHook: CollectionAfterDeleteHook = async ({
    req, // full express request
    id, // id of document that got deleted
    doc, // deleted document
  }) => {
    const modelsToDeleteOn: {
      [collection: string]: Array<any>;
    } = {};

    // the relationalIntegrity array contains data about all of the places the
    // doc/id combo that was just deleted could have been referenced
    for (const key in relationalIntegrity) {
      const targetToCheck = relationalIntegrity[key];

      if (!modelsToDeleteOn[targetToCheck.collectionSlug]) {
        modelsToDeleteOn[targetToCheck.collectionSlug] = [];
      }

      modelsToDeleteOn[targetToCheck.collectionSlug].push({
        updateMany: {
          ...unsetReferencedIDInCollection(
            targetToCheck.hasMany,
            targetToCheck.polymorphic,
            targetToCheck.path,
            [id]
          ),
        },
      });
    }

    executeBatchQuery([modelsToDeleteOn]);
  };

  return afterDeleteHook;
};

export { getAfterDeleteHook };
