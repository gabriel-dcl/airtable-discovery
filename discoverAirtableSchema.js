import * as fs from 'fs';
import 'dotenv/config'


const baseId = process.env.BASE_ID
console.log(process.env.AIRTABLE_TOKEN)

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


const defineType = (airtableType, options, data) => {
    switch (airtableType) {
        case "autoNumber":
        case "rating":
            return "number";
        case "checkbox": return "boolean";
        case "multipleSelects": return "string[]";
        case "singleLineText":
        case "multilineText":
        case "email":
        case "richText":
        case "date":
        case "dateTime":
        case "currency":
        case "formula": return "string"
        case "multipleLookupValues" :
            if(options){
                let allFields = []
                    data.tables.map((table) => table.fields.map((field) => allFields.push(field) ))

                const rightField = allFields.find((item) => item.id === options.fieldIdInLinkedTable)

                if(rightField)
                    return defineType(rightField.type, rightField.options, data)
            }

        case "multipleRecordLinks":
            if(options){
             const searchedValue = data.tables.find(table => table.id === options.linkedTableId)
                if(searchedValue)
                return `${getFormatedName(searchedValue.name)}[]`
            }

        case "singleSelect":
            const choices = []
            let stringToReturn =" "

            if(options && options.choices){
                options.choices.forEach((choice) => choices.push(choice) )
                choices.map((choice, index) => {
                 stringToReturn += `"${getFormatedName(choice.name)}"`
                    if(index != choices.length -1)
                        stringToReturn += " | "
                } )

                return stringToReturn;
            }
    }

    return airtableType;
}


const acquireSchema = (data) => {
    let relationTable = "export enum AirtableRelationTable {\n"

    data.tables.forEach(table => {
        let finalString = ''
        let fields = ''
        let mappers =
            `export const getMappedData${getFormatedName(table.name)} = (records: any[]) => {\n
         const data = records.map((item) => item.fields) \n
         return data.map((item) => { return { \n
        `
        let headers = []
        relationTable += `${getFormatedName(table.name)} = "${table.name}",\n`


        table.fields.forEach(field => {
            const type = defineType(field.type, field.options, data);

            fields += `  ${getFormatedName(field.name)}: ${type};\n`
            mappers += `${getFormatedName(field.name)} : item["${field.name}"],\n`

            if(!type.includes("|")
                && getFormatedName(type) != getFormatedName(table.name)
                && !headers.includes(type)
                &&  !["string", "number", "boolean", "string[]", 'number[]'].includes(type) ){

                headers.push(type)
            }
        })

        headers.forEach((item) => {
            finalString += `import { ${getFormatedName(item)} } from "./${getFormatedName(item)}";\n`
        })
        finalString += `export interface ${getFormatedName(table.name)} { \n`
        finalString += fields
        finalString += `}\n\n`

        mappers += `}})\n  }\n\n`
        finalString += mappers

        fs.writeFile(`./types/${getFormatedName(table.name)}.ts`, finalString, (err) => {
            if (err)
                console.log(err);
            else {
            }
        });
    })

    relationTable += "\n}\n"
    fs.writeFile(`./types/utils.ts`, relationTable, (err) => {

    })

}




