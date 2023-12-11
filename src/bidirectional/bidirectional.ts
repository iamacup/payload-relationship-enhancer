import _get from "lodash/get";
import _isEqual from "lodash/isEqual";
import type {
  CollectionAfterChangeHook,
  CollectionConfig,
} from "payload/dist/exports/types";
import { biDirectionalLookupsPathSpecifics } from "../types";

import mongoose from "mongoose";
import { executeBatchQuery } from "../util/database";
import {
  compareArrays,
  flattenDataToCollection,
  getIDsFromReferenceField,
  getUpdate,
  removeValuesFromRelated,
} from "./util";

const getAfterChangeHook = (
  biDirectional: biDirectionalLookupsPathSpecifics,
  collection: CollectionConfig
) => {
  const afterChangeHook: CollectionAfterChangeHook = async ({
    doc, // full document data
    req, // full express request
    previousDoc, // document data before updating the collection
    operation, // name of the operation ie. 'create', 'update'
  }) => {
    const modelsToDeleteOn: {
      [collection: string]: Array<any>;
    } = {};
    const modelsToUpdateOn: {
      [collection: string]: Array<any>;
    } = {};

    // when we update we need to know what it was before
    if (operation === "update") {
      for (const key in biDirectional) {
        const configItem = biDirectional[key];

        const oldValue = _get(
          previousDoc,
          configItem.triggerCollection.fieldPath
        );

        const newValue = _get(doc, configItem.triggerCollection.fieldPath);

        if (_isEqual(newValue, oldValue)) {
          return doc;
        }

        const oldTargetRelationFieldValues = oldValue
          ? getIDsFromReferenceField(
              oldValue,
              configItem.triggerCollection.hasMany,
              configItem.triggerCollection.polymorphic,
              configItem.triggerCollection.relationCollections
            )
          : [];

        const newTargetRelationFieldValues = newValue
          ? getIDsFromReferenceField(
              newValue,
              configItem.triggerCollection.hasMany,
              configItem.triggerCollection.polymorphic,
              configItem.triggerCollection.relationCollections
            )
          : [];

        const diffs = compareArrays(
          oldTargetRelationFieldValues,
          newTargetRelationFieldValues
        );

        // handle any deletions
        if (diffs.deletions.length > 0) {
          const targetRelationFieldValuesGroupedByCollection =
            flattenDataToCollection(diffs.deletions);

          // we loop all of the places we can sync to
          for (const target of configItem.targets) {
            // get the data for this target
            const idsToRemoveDocumentIDFrom =
              targetRelationFieldValuesGroupedByCollection[
                target.collectionSlug
              ];
            if (
              idsToRemoveDocumentIDFrom &&
              idsToRemoveDocumentIDFrom.length > 0
            ) {
              let update = {};
              const filter = {
                _id: {
                  $in: idsToRemoveDocumentIDFrom.map(
                    // @ts-ignore
                    mongoose.Types.ObjectId
                  ),
                },
              };

              update = getUpdate(false, target, doc.id, configItem);

              if (target.hasMany === false) {
                // unclear if we need to do something here
                // i don't think so because it is a set of deletes....
                console.error(
                  "If this is in the console, we should be doing something here but are not!!"
                );
              }

              if (!modelsToUpdateOn[target.collectionSlug]) {
                modelsToUpdateOn[target.collectionSlug] = [];
              }

              modelsToUpdateOn[target.collectionSlug].push({
                updateMany: {
                  filter,
                  update,
                },
              });
            }
          }
        }

        // handle any addition
        if (diffs.additions.length > 0) {
          const targetRelationFieldValuesGroupedByCollection =
            flattenDataToCollection(diffs.additions);

          // we loop all of the places we can sync to
          for (const target of configItem.targets) {
            // get the data for this target
            const idsToaddDocumentIDto =
              targetRelationFieldValuesGroupedByCollection[
                target.collectionSlug
              ];
            if (idsToaddDocumentIDto && idsToaddDocumentIDto.length > 0) {
              let update = {};

              const filter = {
                _id: {
                  $in: idsToaddDocumentIDto.map(
                    // @ts-ignore
                    mongoose.Types.ObjectId
                  ),
                },
              };

              update = getUpdate(true, target, doc.id, configItem);

              if (target.hasMany === false) {
                removeValuesFromRelated(
                  target,
                  modelsToDeleteOn,
                  idsToaddDocumentIDto
                );
              }

              if (!modelsToUpdateOn[target.collectionSlug]) {
                modelsToUpdateOn[target.collectionSlug] = [];
              }

              modelsToUpdateOn[target.collectionSlug].push({
                updateMany: {
                  filter,
                  update,
                },
              });
            }
          }
        }
      }
    } else if (operation === "create") {
      for (const key in biDirectional) {
        const configItem = biDirectional[key];

        // the value of the field that we need to send to the targets
        const valueOfRelationField = _get(
          doc,
          configItem.triggerCollection.fieldPath
        );

        // might not have set a value in the relation field
        if (valueOfRelationField) {
          // get all of the data that we need to send - i.e. the values of the reference field
          // which we convert to array to unify the format (1-1 etc. are arrays of 1)
          const targetRelationFieldValues = getIDsFromReferenceField(
            valueOfRelationField,
            configItem.triggerCollection.hasMany,
            configItem.triggerCollection.polymorphic,
            configItem.triggerCollection.relationCollections
          );

          const targetRelationFieldValuesGroupedByCollection =
            flattenDataToCollection(targetRelationFieldValues);

          // we loop all of the places we can sync to
          for (const target of configItem.targets) {
            // get the data for this target
            const idsToUpdateWithNewDocumentID =
              targetRelationFieldValuesGroupedByCollection[
                target.collectionSlug
              ];

            if (
              idsToUpdateWithNewDocumentID &&
              idsToUpdateWithNewDocumentID.length > 0
            ) {
              let update = {};

              const filter = {
                _id: {
                  $in: idsToUpdateWithNewDocumentID.map(
                    // @ts-ignore
                    mongoose.Types.ObjectId
                  ),
                },
              };

              update = getUpdate(true, target, doc.id, configItem);

              // handle hasMany: false deletes

              // TODO there is still some optimsiation to do here
              // its possible where A <> C <> B - a new item on C referencing A and B (all hasMany: false)
              // will write two seperate delete operations for the what is the same thing
              // this is because of the loop around targets not being smart enough to combine them

              if (target.hasMany === false) {
                removeValuesFromRelated(
                  target,
                  modelsToDeleteOn,
                  idsToUpdateWithNewDocumentID
                );
              }

              if (!modelsToUpdateOn[target.collectionSlug]) {
                modelsToUpdateOn[target.collectionSlug] = [];
              }

              modelsToUpdateOn[target.collectionSlug].push({
                updateMany: {
                  filter,
                  update,
                },
              });
            }
          }
        }
      }
    }

    const execute = [modelsToDeleteOn, modelsToUpdateOn];
    executeBatchQuery(execute);

    return doc;
  };

  return afterChangeHook;
};

export { getAfterChangeHook };
