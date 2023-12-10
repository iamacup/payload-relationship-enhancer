// TODO we also need to stop saving trash references from admin panel (i.e. deleted stuff)
// TODO relationships nested in arrays - can't query local API properly (cant work out how)
// TODO check all the variations of the relationship type
// TODO internationalisation
// TODO something to stop people deleting required fields - i.e. if someone deletes a referenced object that is required, or brings below min rows for many relation? this should sort of work from the transaction but it does NOT!
// TODO we can probably optimise the logic for creating new ID array for a hasMany reference by limiting the local API depth based on our path so we only get IDs and not objects back
// TODO deleting multiple things at once in admin UI does not completely work.
// TODO only supports default ID setup, changes are not supported
// TODO only supports mongo
// TODO we probably can only support 1 or the other of bidirectional and integriry - enforce in config
// TODO we should parse the bi direction config to ensure its valid

// TODO we only let many to many or 1 to 1 in bi-directional - need to enforce or it breaks.

// THE PROBLEM WE HAVE IS - WHEN THE DELETE HOOK RUNS, WE NEED TO PERFORM
// A DATABASE OPERATION TO REMOVE THE ID FROM THE ARRAY IF IT IS AN ARRAY
// THIS IS BECAUSE THE DELETE HOOKS RUN ASYNC AND SO WE HAVE UPDATE MISSED HELL

// REMOVE TRANSACTION STUFF, IT WORKS IN SO MUCH AS IT BREAKS STUFF.....

// We need to think about how the actual polymorphic / many thing shakes out
// (NP) one - one (NP)
// (P) one - one (P)

import { Config, Plugin } from "payload/config";
import { getAfterChangeHook } from "./src/bidirectional/bidirectional";

import {
  checkBiDirectionalConfig,
  enhanceBiDirectionalConfig,
  getBiDirectionalConfig,
} from "./src/bidirectional/config";
import { getRelationalIntegrityConfig } from "./src/relationshipintegrity/config";
import { getAfterDeleteHook } from "./src/relationshipintegrity/relationshipintegrity";
import { extractRelationships } from "./src/util";
import {
  AllRelationships,
  RelationalIntegrityLookups,
  biDirectionalLookups,
} from "./types";

const RelationshipEnhancerPlugin: Plugin = (
  incomingConfig: Config
): Config => {
  console.log("Starting Relationship Enhancement Plugin");

  if (!incomingConfig.collections) {
    return incomingConfig;
  }

  if (!incomingConfig.db.toString().includes('name: "mongoose"')) {
    console.error(
      "Relationship Enhancer currently only supports Mongo/Mongoose, plugin not started!"
    );

    return incomingConfig;
  }

  // configs
  const relationalIntegrityConfig: RelationalIntegrityLookups = {};
  const biDirectionalConfig: biDirectionalLookups = {};

  const allRelationships: AllRelationships = {};

  for (const collection of incomingConfig.collections!) {
    const relationshipsToEnhance = extractRelationships(collection);
    allRelationships[collection.slug] = relationshipsToEnhance;
  }

  for (const collection of incomingConfig.collections!) {
    const relationshipsToEnhance = allRelationships[collection.slug];

    getRelationalIntegrityConfig(
      relationalIntegrityConfig,
      relationshipsToEnhance,
      collection.slug
    );

    const test = getBiDirectionalConfig(
      biDirectionalConfig,
      relationshipsToEnhance,
      collection.slug,
      allRelationships
    );

    // TODO this should go to the config checker and remove logic inside of biDirectionalConfig
    if (test === null) {
      console.error(
        `Relataionship Enhancer could not initialise because of a config error, missing corresponding field for a bi directional relationship`
      );
      return incomingConfig;
    }
  }

  enhanceBiDirectionalConfig(biDirectionalConfig);

  const configErrors = checkBiDirectionalConfig(biDirectionalConfig);

  if (configErrors === true) {
    console.error("Relation Enhancer did not initialise, fix config errors");
    return incomingConfig;
  }

  const config: Config = {
    ...incomingConfig,
    collections: incomingConfig.collections.map((collection) => {
      // put any relational integrity related hooks on
      if (relationalIntegrityConfig[collection.slug]) {
        const afterDeleteHook = getAfterDeleteHook(
          relationalIntegrityConfig[collection.slug],
          collection
        );

        if (!collection.hooks) {
          collection.hooks = {};
        }

        if (!collection.hooks.afterDelete) {
          collection.hooks.afterDelete = [afterDeleteHook];
        } else {
          collection.hooks.afterDelete.push(afterDeleteHook);
        }
      }

      // put any bi directional related hooks on
      if (biDirectionalConfig[collection.slug]) {
        const afterChangeHook = getAfterChangeHook(
          biDirectionalConfig[collection.slug],
          collection
        );

        if (!collection.hooks) {
          collection.hooks = {};
        }

        if (!collection.hooks.afterChange) {
          collection.hooks.afterChange = [afterChangeHook];
        } else {
          collection.hooks.afterChange.push(afterChangeHook);
        }
      }

      return collection;
    }),
  };

  return config;
};

export default RelationshipEnhancerPlugin;
