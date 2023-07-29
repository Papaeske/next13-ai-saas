import { PineconeClient } from '@pinecone-database/pinecone'
import { TextLoader } from 'langchain/document_loaders/fs/text'
import {
  createPineconeIndex,
  updatePinecone,
  queryPineconeVectorStoreAndQueryLLM
} from '../../../utils'
import { indexName } from '../../../config'

import axios from 'axios';
import { NextResponse, NextRequest } from 'next/server';

class Document {
  pageContent: any;
  metadata: any;
  constructor(pageContent, metadata) {
    this.pageContent = pageContent;
    this.metadata = metadata;
  }
}

async function loadDocumentsFromCSV(csvData) {
  const lines = csvData.split('\n');
  const documents = lines.map((line, index) => {
    const cells = line.split(',');

    const question = cells[0];
    const response = cells[1];

    const pageContent = `Customer Question: ${question}\nBest Response: ${response}`;
    const metadata = { source: 'customer_service_responses.csv', line: index + 1 };

    return new Document(pageContent, metadata);
  });

  return documents;
}

export async function GET(req: NextRequest) {
  try {
    const csvUrls = req.nextUrl.searchParams.get('csvurls') as string;
    const message = req.nextUrl.searchParams.get('message')  as string;
    const urlsArray = csvUrls.split(',');
    const csvResponses = await Promise.all(urlsArray.map(url => axios.get(url)));

    const documents = await Promise.all(csvResponses.map(response => loadDocumentsFromCSV(response.data)));
    const allDocuments = documents.flat();

    const combinedData = allDocuments.join('\n');
    
    const blob = new Blob([combinedData], { type: 'text/csv' });

    const loader = new TextLoader(blob)

    const docs = await loader.load()

    const vectorDimensions = 768
  
    const client = new PineconeClient()
    await client.init({
      apiKey: process.env.PINECONE_API_KEY || '',
      environment: process.env.PINECONE_ENVIRONMENT || ''
    })
  
    try {
      await createPineconeIndex(client, indexName, vectorDimensions)
      await updatePinecone(client, indexName, docs)
    } catch (err) {
      console.log('error: ', err)
    }
  
    const text = await queryPineconeVectorStoreAndQueryLLM(client, indexName, message)
  
    return NextResponse.json({
      data: text
    })

  } catch (error) {
    console.error('Error:', error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// curl "http://localhost:3000/api/knowledge?csvurls=https://raw.githubusercontent.com/Papaeske/next13-ai-saas/main/customer_responses.csv&message=Hello%20World"