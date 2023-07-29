import { GoogleVertexAIEmbeddings } from 'langchain/embeddings/googlevertexai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { GoogleVertexAI } from 'langchain/llms/googlevertexai'
import { LLMChain, loadQAStuffChain } from 'langchain/chains'
import { Document } from 'langchain/document'
import { timeout } from './config'
import { PromptTemplate } from 'langchain'

export const queryPineconeVectorStoreAndQueryLLM = async (
    client,
    indexName,
    message
  ) => {
    console.log('Querying Pinecone vector store...');
    const index = client.Index(indexName);
    const queryEmbedding = await new GoogleVertexAIEmbeddings().embedQuery(message);
  
    let queryResponse = await index.query({
      queryRequest: {
        topK: 3,
        vector: queryEmbedding,
        includeMetadata: true,
        includeValues: true
      },
    });
  
    console.log(`Found ${queryResponse.matches.length} matches...`);

    console.log(queryResponse.matches)

    console.log(`Asking question: ${message}...`);
  
    if (queryResponse.matches.length) {
      const llm = new GoogleVertexAI({ model: 'text-bison' });
      const template =
        'You are a world class business development representat1ve. If you do not find answer in dataset just tell prosepct to contact customer support: I will share a prospect\'s message with you and you will give me the best answer that I should send to this prospect based on past best practies, and you will follow ALL of the rules below: 1/ Response should be very similar or even identical to the past best practies, in terms of length, ton of voice, logical arguments and other details 2/ If the best practice are irrelevant, then try to mimic the style of the best practice Below is a message I received from the prospect: {message} Here is a list of best practies of how we normally respond to prospect in similar scenario {best_practice} Please write the best response that I should send to this prospect (If you do not know answer just tell prosepct to contact customer support):';
      const prompt = new PromptTemplate({ inputVariables: ['message', 'best_practice'], template: template });
  
      const chain = new LLMChain({ llm, prompt });
  
      const result = await chain.call({ message, best_practice: queryResponse });
      console.log(`Answer: ${result.text}`);
  
      return result.text;
    } else {
      console.log('Since there are no matches, GPT-3 will not be queried.');
    }
};
  

export const createPineconeIndex = async (
  client,
  indexName,
  vectorDimension
) => {
  console.log(`Checking "${indexName}"...`);
  const existingIndexes = await client.listIndexes();

  if (!existingIndexes.includes(indexName)) {
    console.log(`Creating "${indexName}"...`);
    await client.createIndex({
      createRequest: {
        name: indexName,
        dimension: vectorDimension,
        metric: 'cosine',
      },
    });
    
    console.log(`Creating index.... please wait for it to finish initializing.`);
    await new Promise((resolve) => setTimeout(resolve, timeout));
  } else {
    console.log(`"${indexName}" already exists.`);
  }
};


export const updatePinecone = async (client, indexName, docs) => {
  console.log('Retrieving Pinecone index...');
  const index = client.Index(indexName);
  console.log(`Pinecone index retrieved: ${indexName}`);

  for (const doc of docs) {
    console.log(`Processing document: ${doc.metadata.source}`);
    const txtPath = doc.metadata.source;
    const text = doc.pageContent;
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
    });

    console.log('Splitting text into chunks...');
    const chunks = await textSplitter.createDocuments([text]);
    console.log(`Text split into ${chunks.length} chunks`);
    console.log(
      `Calling OpenAI's Embedding endpoint documents with ${chunks.length} text chunks ...`
    );

    const embeddingsArrays = await new GoogleVertexAIEmbeddings().embedDocuments(
      chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
    );
    console.log('Finished embedding documents');
    console.log(
      `Creating ${chunks.length} vectors array with id, values, and metadata...`
    );

    const batchSize = 100;
    let batch:any = [];
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const vector = {
        id: `${txtPath}_${idx}`,
        values: embeddingsArrays[idx],
        metadata: {
          ...chunk.metadata,
          loc: JSON.stringify(chunk.metadata.loc),
          pageContent: chunk.pageContent,
          txtPath: txtPath,
        },
      };
      batch = [...batch, vector]
      if (batch.length === batchSize || idx === chunks.length - 1) {
        await index.upsert({
          upsertRequest: {
            vectors: batch,
          },
        });
        batch = [];
      }
    }

    console.log(`Pinecone index updated with ${chunks.length} vectors`);
  }
};