# Getting Started with Airtable Discovery tool

**WARNING : This project is currently the definition of dirtiness**

As Airtable Projects can be defined by a large amount of people and change fast, using it as a database can be a bit tricky. This tool is here to help you discover your Airtable base and its content.

## Requirements

Your target project need the dotenv package to be installed. If it's not the case, you can install it with the following command:

```bash npm install dotenv```

### How to use

1. Copy past the the discoverAirtableSchema.js at the root of your project, with the types folder.
2. Copy the .env.example and fill the token and the base id. 
3. run ```node discoverAirtableSchema.js``` and wait for the result.
4. You now have all your tables defined in the types folder, as well as mapper functions to deal with field name having whitespaces or special characters.
5. The AirtableRelationTable enum in the utils.ts file creates a relationship between the clean name of your table (no whitespaces or special characters) and the name of the table in Airtable. You can use it to create a relationship between your tables.

Now, using the Airtable package, you can work this way : 

```typescript  
 base(AirtableRelationTable.MYTABLE)
      .select({
      })
      .eachPage(
        (records, fetchNextPage) => {
          const mappedData = getMappedDataMYTABLE(records);
        },
        (err) => {
        ...
        }
      );
```