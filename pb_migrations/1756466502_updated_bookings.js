/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980")

  // update field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "declined",
      "pending_confirmation"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_986407980")

  // update field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "declined"
    ]
  }))

  return app.save(collection)
})
