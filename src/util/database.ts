import payload from "payload";

const executeBatchQuery = async (execute: Array<any>) => {
  for (const toExecute of execute) {
    for (const collection in toExecute) {
      // @ts-ignore
      const Model = payload.db.collections[collection];

      await Model.bulkWrite(toExecute[collection]).then((result: any) => {
        //
      });
    }
  }
};

// this generates a filter and update that remove any references,
// at path, to an array of IDs, where it exists.
const unsetReferencedIDInCollection = (
  hasMany: boolean,
  polymorphic: boolean,
  path: string,
  id: Array<string | number>
) => {
  let filter = {};
  let update = {};

  // we let this be an array or not because there probably
  // (i don't know but seems intuitive)
  // is a performance penalty to the $in operator
  if (Array.isArray(id)) {
    // payload does not store anything other than the _id as an ObjectId
    // const objectIds = id.map((id) => mongoose.Types.ObjectId(id));
    const objectIds = id;

    if (hasMany === true && polymorphic === true) {
      filter = {
        [path]: {
          $elemMatch: { value: { $in: objectIds } },
        },
      };

      update = {
        $pull: {
          [path]: { value: { $in: objectIds } },
        },
      };
    } else if (hasMany === true && polymorphic === false) {
      filter = {
        [path]: { $in: objectIds },
      };

      update = {
        $pull: {
          [path]: { $in: objectIds },
        },
      };
    } else if (hasMany === false && polymorphic === false) {
      filter = {
        [path]: { $in: objectIds },
      };

      update = {
        $unset: { [path]: "" },
      };
    } else if (hasMany === false && polymorphic === true) {
      filter = {
        [`${path}.value`]: { $in: objectIds },
      };

      update = {
        $unset: { [path]: "" },
      };
    }
  }
  //  else {
  //   if (hasMany === true && polymorphic === true) {
  //     filter = {
  //       [path]: {
  //         $elemMatch: { value: id },
  //       },
  //     };

  //     update = {
  //       $pull: {
  //         [path]: { value: id },
  //       },
  //     };
  //   } else if (hasMany === true && polymorphic === false) {
  //     filter = {
  //       [path]: id,
  //     };

  //     update = {
  //       $pull: {
  //         [path]: id,
  //       },
  //     };
  //   } else if (hasMany === false && polymorphic === false) {
  //     filter = {
  //       [path]: id,
  //     };

  //     update = {
  //       $unset: { [path]: "" },
  //     };
  //   } else if (hasMany === false && polymorphic === true) {
  //     filter = {
  //       [`${path}.value`]: id,
  //     };

  //     update = {
  //       $unset: { [path]: "" },
  //     };
  //   }
  // }

  return { filter, update };
};

export { executeBatchQuery, unsetReferencedIDInCollection };
