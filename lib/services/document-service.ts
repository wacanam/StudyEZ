import {
  Document,
  VectorStoreIndex,
  storageContextFromDefaults,
  SentenceSplitter,
} from "llamaindex";

/**
 * Service for document operations
 * Single Responsibility: Handle document processing and indexing
 */
export class DocumentService {
  private readonly defaultChunkSize = 512;
  private readonly defaultChunkOverlap = 50;

  /**
   * Chunk text using LlamaIndex's SentenceSplitter
   */
  async chunkText(
    text: string,
    chunkSize: number = this.defaultChunkSize,
    chunkOverlap: number = this.defaultChunkOverlap
  ): Promise<string[]> {
    const document = new Document({ text });

    const splitter = new SentenceSplitter({
      chunkSize,
      chunkOverlap,
    });

    const nodes = splitter.getNodesFromDocuments([document]);
    return nodes.map((node) => node.getText());
  }

  /**
   * Create a LlamaIndex Document from text content
   */
  createDocument(
    text: string,
    metadata: Record<string, unknown> = {}
  ): Document {
    return new Document({
      text,
      metadata,
    });
  }

  /**
   * Build a vector store index from documents using LlamaIndex
   */
  async buildIndexFromDocuments(
    documents: Document[]
  ): Promise<VectorStoreIndex> {
    const storageContext = await storageContextFromDefaults({});

    const index = await VectorStoreIndex.fromDocuments(documents, {
      storageContext,
    });

    return index;
  }

  /**
   * Query an index and get response with sources
   */
  async queryIndex(
    index: VectorStoreIndex,
    query: string
  ): Promise<{ response: string; sources: string[] }> {
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({ query });

    const sources = response.sourceNodes?.map((node) => {
      const textNode = node.node as unknown as { text?: string };
      return textNode.text || "";
    }) || [];

    return {
      response: response.toString(),
      sources,
    };
  }
}

// Export singleton instance
export const documentService = new DocumentService();
