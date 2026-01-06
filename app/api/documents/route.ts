import { NextRequest } from "next/server";
import { requireAuth, isAuthSuccess } from "@/lib/middleware/auth-middleware";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { ApiResponseBuilder } from "@/lib/utils/api-response";
import { getPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user using middleware
    const authResult = await requireAuth();
    if (!isAuthSuccess(authResult)) {
      return authResult.error;
    }
    const { userId } = authResult;

    const db = getPrisma();
    
    // Fetch all documents for the user with timeout handling
    let documents;
    try {
      documents = await Promise.race([
        db.document.findMany({
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
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Database query timeout")), 20000)
        ),
      ]);
    } catch (dbError) {
      if (dbError instanceof Error && dbError.message === "Database query timeout") {
        return ErrorHandler.createErrorResponse(
          dbError,
          "Database query timed out. Please check your database connection and try again.",
          503
        );
      }
      throw dbError;
    }

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

    return ApiResponseBuilder.success({
      files: fileList,
      totalDocuments: documents.length,
    });
  } catch (error) {
    return ErrorHandler.handleRouteError(error, "Failed to fetch documents");
  }
}
