import { CollectionConfig } from "payload/types";

const A: CollectionConfig = {
  slug: "a",
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "name",
      type: "text",
    },
    {
      type: "relationship",
      relationTo: "c",
      hasMany: true,
      name: "amixedblocks",
      custom: {
        relationshipEnhancer: {
          relationshipIntegrity: true,
          biDirectional: [
            {
              relationTo: "c",
              path: "cmixedblocks",
            },
          ],
        },
      },
    },
  ],
};

export default A;
