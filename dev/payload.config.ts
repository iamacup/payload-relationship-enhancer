import path from "path";

import RelationshipEnhancerPlugin from "../src/";

import { webpackBundler } from "@payloadcms/bundler-webpack";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { payloadCloud } from "@payloadcms/plugin-cloud";
import { slateEditor } from "@payloadcms/richtext-slate";
import { buildConfig } from "payload/config";

import A from "./collections/A";
import B from "./collections/B";
import C from "./collections/C";
import Users from "./collections/Users";

export default buildConfig({
  admin: {
    user: Users.slug,
    bundler: webpackBundler(),
  },
  editor: slateEditor({}),
  collections: [Users, A, B, C],
  localization: {
    locales: [
      {
        label: "English",
        code: "en",
      },
      {
        label: "French",
        code: "fr",
      },
    ],
    defaultLocale: "en",
    fallback: true,
  },
  typescript: {
    outputFile: path.resolve(__dirname, "payload-types.ts"),
  },
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, "generated-schema.graphql"),
  },
  plugins: [payloadCloud(), RelationshipEnhancerPlugin],
  db: mongooseAdapter({
    url: process.env.DATABASE_URI!,
  }),
});
