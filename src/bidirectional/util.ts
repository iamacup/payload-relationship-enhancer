import _isEqual from "lodash/isEqual";
import {
  biDirectionalLookupsPathSpecifics,
  biDirectionalTarget,
} from "../types";

import { unsetReferencedIDInCollection } from "../util/database";

// TODO i think we need
// afterCreate - we just blindly sync
// beforeUpdate - we can test to see what changed, and then we don't need to do an expensive 'sync' op for any and every update? or do we just do the update?
// afterDelete - to remove all the references as with the relational integrity?

type IDsFromReferenceField = Array<{
  value: string;
  relationTo: string;
}>;

export const getIDsFromReferenceField = (
  field: any,
  hasMany: boolean,
  polymorphic: boolean,
  relationCollections: string[]
): IDsFromReferenceField => {
  if (polymorphic === true && hasMany === true) {
    return field as IDsFromReferenceField;
  } else if (polymorphic === true && hasMany === false) {
    return [field] as IDsFromReferenceField;
  } else if (polymorphic === false && hasMany === false) {
    return [
      {
        value: field as string,
        relationTo: relationCollections[0],
      },
    ];
  } else if (polymorphic === false && hasMany === true) {
    const res: IDsFromReferenceField = [];

    (field as Array<string>).forEach((id) => {
      res.push({
        value: id,
        relationTo: relationCollections[0],
      });
    });

    return res;
  }

  return [];
};

export const compareArrays = (
  oldArray: IDsFromReferenceField,
  newArray: IDsFromReferenceField
) => {
  // Finding additions (present in new array but not in old array)
  const additions = newArray.filter(
    (newItem) => !oldArray.some((oldItem) => _isEqual(oldItem, newItem))
  );

  // Finding deletions (present in old array but not in new array)
  const deletions = oldArray.filter(
    (oldItem) => !newArray.some((newItem) => _isEqual(oldItem, newItem))
  );

  // Finding remains (present in both arrays)
  const remains = newArray.filter((newItem) =>
    oldArray.some((oldItem) => _isEqual(oldItem, newItem))
  );

  return { additions, deletions, remains };
};

export const flattenDataToCollection = (data: IDsFromReferenceField) => {
  const res: {
    [collection: string]: Array<string | number>;
  } = {};

  for (const val of data) {
    if (!res[val.relationTo]) {
      res[val.relationTo] = [];
    }

    res[val.relationTo].push(val.value);
  }

  return res;
};

export const getUpdate = (
  adder: boolean,
  target: biDirectionalTarget,
  id: string,
  configItem: biDirectionalLookupsPathSpecifics[string]
) => {
  let update = {};

  if (adder === true) {
    if (target.polymorphic === true && target.hasMany === true) {
      update = {
        $addToSet: {
          [target.fieldPath]: {
            value: id,
            relationTo: configItem.triggerCollection.collectionSlug,
          },
        },
      };
    } else if (target.polymorphic === true && target.hasMany === false) {
      update = {
        $set: {
          [target.fieldPath]: {
            value: id,
            relationTo: configItem.triggerCollection.collectionSlug,
          },
        },
      };
    } else if (target.polymorphic === false && target.hasMany === false) {
      update = {
        $set: {
          [target.fieldPath]: id,
        },
      };
    } else if (target.polymorphic === false && target.hasMany === true) {
      update = {
        $addToSet: { [target.fieldPath]: id },
      };
    }
  } else {
    if (target.polymorphic === true && target.hasMany === true) {
      update = {
        $pull: {
          [target.fieldPath]: {
            value: id,
            relationTo: configItem.triggerCollection.collectionSlug,
          },
        },
      };
    } else if (target.polymorphic === true && target.hasMany === false) {
      update = {
        $unset: { [target.fieldPath]: "" },
      };
    } else if (target.polymorphic === false && target.hasMany === false) {
      update = {
        $unset: { [target.fieldPath]: "" },
      };
    } else if (target.polymorphic === false && target.hasMany === true) {
      update = {
        $pull: { [target.fieldPath]: id },
      };
    }
  }

  return update;
};

export const removeValuesFromRelated = (
  target: biDirectionalTarget,
  modelsToDeleteOn: {
    [collection: string]: Array<any>;
  },
  idsToRemove: Array<string | number>
) => {
  for (const relatedCollectionSlug of target.relationCollections) {
    const deleteConfig =
      target.relationCollectionsConfigCopy[relatedCollectionSlug];

    if (!modelsToDeleteOn[deleteConfig.collectionSlug]) {
      modelsToDeleteOn[deleteConfig.collectionSlug] = [];
    }

    modelsToDeleteOn[deleteConfig.collectionSlug].push({
      updateMany: {
        ...unsetReferencedIDInCollection(
          deleteConfig.hasMany,
          deleteConfig.polymorphic,
          deleteConfig.fieldPath,
          idsToRemove
        ),
      },
    });
  }
};
