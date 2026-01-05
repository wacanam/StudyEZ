import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user's ID
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = getPrisma();
    
    // Fetch all documents for the user
    const documents = await db.document.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group documents by fileName and aggregate chunk information
    const fileMap = new Map<string, {
      fileName: string;
      chunkCount: number;
      uploadDate: Date;
      documentIds: number[];
    }>();

    for (const doc of documents) {
      const metadata = doc.metadata as Record<string, unknown>;
      const fileName = (metadata.fileName as string) || "Unknown";
      
      if (!fileMap.has(fileName)) {
        fileMap.set(fileName, {
          fileName,
          chunkCount: 0,
          uploadDate: doc.createdAt,
          documentIds: [],
        });
      }
      
      const fileData = fileMap.get(fileName)!;
      fileData.chunkCount++;
      fileData.documentIds.push(doc.id);
      
      // Keep the first upload date (earliest chunk)
      if (doc.createdAt < fileData.uploadDate) {
        fileData.uploadDate = doc.createdAt;
      }
    }

    // Convert map to array
    const fileList = Array.from(fileMap.values());

    return NextResponse.json({
      files: fileList,
      totalDocuments: documents.length,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch documents: ${errorMessage}` },
      { status: 500 }
    );
  }
}
