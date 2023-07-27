import axios from 'axios';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { GoogleVertexAIEmbeddings } from 'langchain/embeddings/googlevertexai';
import { PromptTemplate } from 'langchain/prompts';
import { ChatGoogleVertexAI } from 'langchain/chat_models/googlevertexai';
import { LLMChain } from 'langchain/chains';

class Document {
  constructor(pageContent, metadata) {
    this.pageContent = pageContent;
    this.metadata = metadata;
  }
}

// Function to load documents from CSV string data
async function loadDocumentsFromCSV(csvData) {
  const lines = csvData.split('\n');

  // Create an array of Document objects with the desired format
  const documents = lines.map((line, index) => {
    const cells = line.split(',');

    // Assuming the first cell is the question and the second cell is the response
    const question = cells[0];
    const response = cells[1];

    // Create the pageContent string with the desired format
    const pageContent = `Customer Question: ${question}\nBest Response: ${response}`;

    // Create the metadata object
    const metadata = { source: 'customer_service_responses.csv', line: index + 1 };

    // Return the Document object with the desired format
    return new Document(pageContent, metadata);
  });

  return documents;
}

// Function to create a FaissStore with GoogleVertexAI embeddings
async function createFaissStoreWithEmbeddings(documents) {
  return await FaissStore.fromDocuments(documents, new GoogleVertexAIEmbeddings());
}

// Function to perform similarity search on the FaissStore
async function performSimilaritySearch(db, query, topK) {
  return await db.similaritySearch(query, topK);
}

// Function to initialize ChatGoogleVertexAI model
function initializeChatGoogleVertexAI() {
  return new ChatGoogleVertexAI({
    model: 'chat-bison',
    temperature: 0,
    maxOutputTokens: 1024,
  });
}

// Function to create a PromptTemplate for message generation
function createPromptTemplate(template, inputVariables) {
  return new PromptTemplate({
    inputVariables,
    template,
  });
}

// Function to generate a response using LLMChain
async function generateResponse(llm, prompt, variables) {
  const chain = new LLMChain({ llm: llm, prompt });
  return await chain.call(variables);
}

// Next.js serverless function to handle the main process
export default async function handler(req, res) {
  const csvUrls = req.query.csvurls; // Comma-separated URLs as a string
  const message = req.query.message;
  const topK = 3; // You can adjust the topK value as needed

  try {
    const urlsArray = csvUrls.split(','); // Split the comma-separated string into an array of URLs
    const csvResponses = await Promise.all(urlsArray.map(url => axios.get(url)));
    const documents = await Promise.all(csvResponses.map(response => loadDocumentsFromCSV(response.data)));

    const allDocuments = documents.flat(); // Flatten the array of arrays

    const db = await createFaissStoreWithEmbeddings(allDocuments);
    const result = await performSimilaritySearch(db, message, topK);

    const llm = initializeChatGoogleVertexAI();

    const template = 'You are a world class business development representat1ve: I will share a prospect\'s message with you and you will give me the best answer that I should send to this prospect based on past best practies, and you will follow ALL of the rules below: 1/ Response should be very similar or even identical to the past best practies, in terms of length, ton of voice, logical arguments and other details 2/ If the best practice are irrelevant, then try to mimic the style of the best practice Below is a message I received from the prospect: {message} Here is a list of best practies of how we normally respond to prospect in similar scenario {best_practice} Please write the best response that I should send to this prospect:';

    const prompt = createPromptTemplate(template, ['message', 'best_practice']);

    const variables = { message, best_practice: result };
    const response = await generateResponse(llm, prompt, variables);
    res.json({ response: response.text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  }
}