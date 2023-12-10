import { CollectionConfig } from "payload/types";

const Users: CollectionConfig = {
  slug: "users",
  access: {
    read: () => true,
  },
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [
    
  ],
};

export default Users;
