import { CollectionConfig } from "payload/types";

const B: CollectionConfig = {
  slug: "b",
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
      hasMany: false,
      name: "bmixedblocks",
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

export default B;
