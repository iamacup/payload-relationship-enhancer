import { CollectionConfig } from "payload/types";

const C: CollectionConfig = {
  slug: "c",
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
      relationTo: ["a", "b"],
      hasMany: true,
      name: "cmixedblocks",
      custom: {
        relationshipEnhancer: {
          relationshipIntegrity: true,
          biDirectional: [
            {
              relationTo: "a",
              path: "amixedblocks",
            },
            {
              relationTo: "b",
              path: "bmixedblocks",
            },
          ],
        },
      },
    },
    {
      type: "relationship",
      relationTo: "a",
      hasMany: true,
      name: "cmixedblocks2",
      custom: {
        relationshipEnhancer: {
          relationshipIntegrity: true,
          biDirectional: [
            {
              relationTo: "a",
              path: "amixedblocks2",
            },
          ],
        },
      },
    },
  ],
};

export default C;
