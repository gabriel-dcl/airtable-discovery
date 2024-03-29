#!/usr/bin/env node

import * as fs from 'fs';
import 'dotenv/config'


// Access command-line arguments, excluding the first two elements (Node.js and script path).
const args = process.argv.slice(2);

const baseId = args[0]
const name = args[1]

var myHeaders = new Headers();
myHeaders.append("Authorization", `Bearer ${process.env.AIRTABLE_TOKEN}`);

var requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow'
};

fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, requestOptions)
    .then(response => response.text())
    .then(result => acquireSchema(JSON.parse(result)))
    .catch(error => console.log('error', error));

const getFormatedName = (name) => {
    if(name)
        return name.replace(/[^a-zA-Z]+/g, '')
}

const getFileName = (name) => {
    if (name)
        return name.replace(/\s/g, "-").replace(/[^a-zA-Z-]+/g, '').replace(/^[-]+([a-zA-Z])/, '$1').toLowerCase()
}

const defineType = (airtableType, options, data) => {
    switch (airtableType) {
        case "autoNumber":
        case "rating":
        case "percent":
        case"number":
            return "number";
        case "checkbox":
            return "boolean";
        case "multipleSelects": return "string[]";
        case "singleLineText":
        case "multilineText":
        case "email":
        case "richText":
        case "date":
        case "dateTime":
        case "currency":
        case "url":
        case "createdTime":
        case "formula":
            return "string"
        case "multipleLookupValues" :
            if(options){
                let allFields = []
                data.tables.map((table) => table.fields.map((field) => allFields.push(field) ))

                const rightField = allFields.find((item) => item.id === options.fieldIdInLinkedTable)

                if(rightField)
                    return defineType(rightField.type, rightField.options, data)
            }

        case "singleSelect":
            const choices = []
            let stringToReturn =" "

            if(options && options.choices){
                options.choices.forEach((choice) => choices.push(choice) )
                choices.map((choice, index) => {
                    stringToReturn += `"${choice.name}"`
                    if(index != choices.length -1)
                        stringToReturn += " | "
                } )

                return stringToReturn;
            }
        case "multipleRecordLinks":
            return "string[]"
    }

    return airtableType;
}


const acquireSchema = (data) => {
    let relationTable = `export enum Airtable${name.charAt(0).toUpperCase() + name.slice(1)}RelationTable {\n`

    data.tables.forEach(table => {
        let finalString = ''
        let fields = ''
        let mappers =
            `export const getMappedData${getFormatedName(table.name)} = (records: any[]) => {\n
         const data = records.map((item) => item.fields) \n
         return data.map((item, key) => { return { \n
         id: records[key].id, \n
        `
        let reverseMappers =
            `export const mapData${getFormatedName(table.name)} = (data: any[]) => {\n
         return data.map((item, key) => { return { \n
         
        `
        let headers = []
        relationTable += `${getFormatedName(table.name)} = "${table.name}",\n`


        table.fields.forEach(field => {
            const type = defineType(field.type, field.options, data);


            if(type === "string[]")
                fields += `  ${getFormatedName(field.name)}: ${type};\n`
            else if (!type.includes("|"))
                fields += `  ${getFormatedName(field.name)}: ${getFormatedName(type)};\n`
            else
                fields += `  ${getFormatedName(field.name)}: ${type};\n`


            mappers += `${getFormatedName(field.name)} : item["${field.name}"],\n`
            reverseMappers += `"${field.name}" : item.${getFormatedName(field.name)} ,\n`


            if (!type.includes("|")
                && getFormatedName(field.name) != getFormatedName(table.name)
                && !headers.includes(type)
                && !["string", "number", "boolean", "string[]", 'number[]'].includes(type)) {
                headers.push(type)
            }
        })


        if (process.env.NEXT_PROJECT === 'true') {

            headers.forEach((item) => {
                if (["singleCollaborator", "multipleAttachments", "multipleCollaborators"].includes(getFormatedName(item)))
                    finalString += `import { ${getFormatedName(item)} } from "../../types/${getFormatedName(item)}";\n`
                else
                    finalString += `import { ${getFormatedName(item)} } from "../../${getFileName(item)}/entities/${getFileName(item)}.entity";\n`
            })
        } else {
            headers.forEach((item) => {
                finalString += `import { ${getFormatedName(item)} } from "./${getFormatedName(item)}";\n`
            })
        }

        finalString += `export interface ${getFormatedName(table.name)} { \n`
        finalString += fields
        finalString += `}\n\n`

        mappers += `}})\n  }\n\n`
        reverseMappers += `}})\n  }\n\n`
        finalString += mappers
        finalString += reverseMappers

        if (process.env.NEXT_PROJECT === 'true') {

            try {
                fs.mkdirSync(`./src/${getFileName(table.name)}`);
                fs.mkdirSync(`./src/${getFileName(table.name)}/entities`);
            } catch (e) {
                //console.log(e)
            }
            fs.writeFile(`./src/${getFileName(table.name)}/entities/${getFileName(table.name)}.entity.ts`, finalString, (err) => {
                if (err)
                    console.log(err);
                else {
                }
            });
        } else {
            fs.writeFile(`./types/${getFormatedName(table.name)}.ts`, finalString, (err) => {
                if (err)
                    console.log(err);
                else {
                }
            });
        }
    })


    try {
        fs.mkdirSync(`./src/types`);
    } catch (e) {

    }

    fs.copyFileSync('./node_modules/airtable-discovery/types/multipleAttachments.ts',
        "./src/types/multipleAttachments.ts")

    fs.copyFileSync('./node_modules/airtable-discovery/types/singleCollaborator.ts',
        "./src/types/singleCollaborator.ts")

    fs.copyFileSync('./node_modules/airtable-discovery/types/multipleCollaborators.ts',
        "./src/types/multipleCollaborators.ts")

    relationTable += "\n}\n"
    fs.writeFile(`./src/types/${name}.utils.ts`, relationTable, (err) => {

    })

}