/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4292580562")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation2375276105",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "user",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1581114487",
    "max": 100,
    "min": 3,
    "name": "skill",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "json1090999472",
    "maxSize": 0,
    "name": "specialties",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "convertURLs": false,
    "hidden": false,
    "id": "editor1843675174",
    "maxSize": 0,
    "name": "description",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "editor"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number3756801849",
    "max": 10000000,
    "min": 0,
    "name": "rate",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number183335417",
    "max": 50,
    "min": 0,
    "name": "years_experience",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "select1068999359",
    "maxSelect": 1,
    "name": "availability",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Available",
      "Busy",
      "Offline"
    ]
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "number3632866850",
    "max": 5,
    "min": 0,
    "name": "rating",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "number3423705337",
    "max": null,
    "min": 0,
    "name": "completed_jobs",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "file2850885730",
    "maxSelect": 10,
    "maxSize": 0,
    "mimeTypes": [],
    "name": "portfolio",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4292580562")

  // remove field
  collection.fields.removeById("relation2375276105")

  // remove field
  collection.fields.removeById("text1581114487")

  // remove field
  collection.fields.removeById("json1090999472")

  // remove field
  collection.fields.removeById("editor1843675174")

  // remove field
  collection.fields.removeById("number3756801849")

  // remove field
  collection.fields.removeById("number183335417")

  // remove field
  collection.fields.removeById("select1068999359")

  // remove field
  collection.fields.removeById("number3632866850")

  // remove field
  collection.fields.removeById("number3423705337")

  // remove field
  collection.fields.removeById("file2850885730")

  return app.save(collection)
})
