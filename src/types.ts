import { Field } from "payload/dist/exports/types";

export type FieldAndPath = {
  field: Field;
  path: string;
};

export type AllRelationships = {
  [collectionSlug: string]: Array<FieldAndPath>;
};

export type RelationshipEnhancement = {
  relationshipEnhancer: {
    biDirectional: {
      targetCollection: "";
      targetField: "";
    };
    relationshipIntegrity: true;
  };
};

export type RelationalIntegrityLookupsPathSpecifics = {
  [pathCollectionUnique: string]: {
    path: string; // the path of the field that might need to be told about a delete (is a relation that can reference the deleted collection)
    collectionSlug: string; // the collection that contains the path
    polymorphic: boolean; // true if the thing we are checking has more than 1 relation (changes data structure)
    hasMany: boolean; // true if there can be many relations (changes data structure)
  };
};

export type RelationalIntegrityLookups = {
  // the collection where a delete will trigger a relational field update
  [
    collectionSlug: string
  ]: // an array of collections and fields to 'tell' about the update
  RelationalIntegrityLookupsPathSpecifics;
};

export type biDirectionalTarget = {
  // the collection that needs to be 'told' about the update
  collectionSlug: string;
  fieldPath: string;
  hasMany: boolean;
  polymorphic: boolean;
  relationCollections: Array<string>;
  relationCollectionsConfigCopy: {
    [collectionSlug: string]: biDirectionalTarget;
  };
};

export type biDirectionalLookupsPathSpecifics = {
  [pathCollectionUnique: string]: {
    targets: Array<biDirectionalTarget>;
    triggerCollection: {
      collectionSlug: string; // the collection of the triggering field
      fieldPath: string; // the path of the triggering field
      polymorphic: boolean; // true if the trigger relationship points to more than 1 collection (or points to 1 collection that is defined in an array)
      hasMany: boolean; // the trigger relationship hasMany
      relationCollections: Array<string>; // where the trigger relationship points to
    };
  };
};

export type biDirectionalLookups = {
  // the collection where a change will trigger a change with some other thing
  [
    collectionSlug: string
  ]: // an array of collections and fields to 'tell' about the update
  biDirectionalLookupsPathSpecifics;
};
