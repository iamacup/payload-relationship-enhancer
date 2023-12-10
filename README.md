# payload-relationship-enhancer

This is a very early release of a plugin designed to enhance the relationships within payload to do two things:

1. Provide `referential integrity` through deletes - i.e. if A references B and then B is deleted, A should no longer reference A
2. Provide `bi-directional` relationships - i.e. if A references B, allow B to reference A and keep them in sync.

**Motivation**: if you have used keystonejs you know why, but more importantly, this stops gymnastics at query time to try and reverse lookup a relationship and instead builds it into the GraphQL / REST schema

## A word of warning

This was written by someone who is bad at coding, and until a week ago had never used Mongo or Payload. Performance is probably bad and it might delete all your relationships.

## Getting started

1. `bun add payload-relationship-enhancer`

2. update your payload config like this:

```
import RelationshipEnhancerPlugin from "payload-relationship-enhancer";

plugins: [payloadCloud(), RelationshipEnhancerPlugin],
```

## Limitations / TODO

* Currently any relationship field nested under an array will be ignored by this plugin, groups and tabs and blocks should be fine.
* Only Mongo is supported as a database, it is very possible to add Postgres.
* Support for localised relationship fields is not yet there
* The changes made by this plugin do NOT trigger lifecycle hooks - i.e. if you have a bi-directional relationship between A and B, and set the value in A to some B document, the plugin will update a B document but no update hook will run - this is because we use the mongoose adapter directly and I am not sure exactly how to manually trigger updates.
* This really needs some tests
* I don't think the structure of this plugin follows best practice
* Should add some plugin init config params for profiling performance

## Contributing

Please do.