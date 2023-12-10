import type { CollectionConfig, Field } from "payload/dist/exports/types";
import { FieldAndPath } from "../types";

const findRelationships = (obj: Field, path: string = ""): FieldAndPath[] => {
  let relationships: FieldAndPath[] = [];
  let currentPath = path;

  // build a path we can use for the API later - this ignores stuff like tabs etc.
  // which don't have names and are not in the API
  if ("name" in obj) {
    currentPath = path ? `${path}.${obj.name}` : obj.name;
  }

  if (obj.type === "relationship") {
    // we only care about relationships that have relationshipEnhancer config in the custom prop
    if (obj.custom && obj.custom.relationshipEnhancer) {
      relationships.push({ field: obj, path: currentPath });
    }
  } else if (obj.type === "blocks") {
    for (const block of obj.blocks) {
      for (const field of block.fields) {
        relationships = relationships.concat(
          findRelationships(field, currentPath)
        );
      }
    }
  } else if (obj.type === "tabs") {
    for (const tab of obj.tabs) {
      for (const field of tab.fields) {
        relationships = relationships.concat(
          findRelationships(field, currentPath)
        );
      }
    }
  } else if (
    obj.type === "array" ||
    obj.type === "group" ||
    obj.type === "row" ||
    obj.type === "collapsible"
  ) {
    // special case for arrays path
    if (obj.type === "array") {
      // we don't support arrays, tried, can't get the local API to query them properly
    } else {
      for (const field of obj.fields) {
        relationships = relationships.concat(
          findRelationships(field, currentPath)
        );
      }
    }
  }

  return relationships;
};

const extractRelationships = (
  collectionConfig: CollectionConfig
): FieldAndPath[] => {
  let result: FieldAndPath[] = [];

  for (const field of collectionConfig.fields) {
    result = result.concat(findRelationships(field));
  }

  return result;
};

// TODO not clear if this is correct, equals: id works for both cases it seems...
const generateWhereClause = (id: string | number, hasMany: boolean) => {
  if (hasMany === true) {
    return { contains: id };
  } else {
    return { equals: id };
  }
};

export { extractRelationships, generateWhereClause };
