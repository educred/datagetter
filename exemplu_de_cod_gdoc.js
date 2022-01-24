// Before running the sample:
// - Enable the API at:
//   https://console.developers.google.com/apis/api/docs.googleapis.com
// - Login into gcloud by running:
//   `$ gcloud auth application-default login`
// - Install the npm module by running:
//   `$ npm install googleapis`

const {google} = require('googleapis');
const docs = google.docs('v1');

async function main() {
  const auth = new google.auth.GoogleAuth({
    // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: [
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });

  // Acquire an auth client, and bind it to all future calls
  const authClient = await auth.getClient();
  google.options({auth: authClient});

  // Do the magic
  const res = await docs.documents.get({
    // The ID of the document to retrieve.
    documentId: 'placeholder-value',
    // The suggestions view mode to apply to the document. This allows viewing the document with all suggestions inline, accepted or rejected. If one is not specified, DEFAULT_FOR_CURRENT_ACCESS is used.
    suggestionsViewMode: 'placeholder-value',
  });
  console.log(res.data);

  // Example response
  // {
  //   "body": {},
  //   "documentId": "my_documentId",
  //   "documentStyle": {},
  //   "footers": {},
  //   "footnotes": {},
  //   "headers": {},
  //   "inlineObjects": {},
  //   "lists": {},
  //   "namedRanges": {},
  //   "namedStyles": {},
  //   "positionedObjects": {},
  //   "revisionId": "my_revisionId",
  //   "suggestedDocumentStyleChanges": {},
  //   "suggestedNamedStylesChanges": {},
  //   "suggestionsViewMode": "my_suggestionsViewMode",
  //   "title": "my_title"
  // }
}

main().catch(e => {
  console.error(e);
  throw e;
});
