import { NextResponse } from "next/server";
import { testDatabaseConnection, getPrisma } from "@/lib/db";

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    const dbTime = Date.now() - startTime;

    if (!dbConnected) {
      return NextResponse.json(
        {
          status: "unhealthy",
          database: {
            connected: false,
            responseTime: dbTime,
            error: "Failed to connect to database",
          },
        },
        { status: 503 }
      );
    }

    // Test database query
    const queryStart = Date.now();
    const db = getPrisma();
    const documentCount = await db.document.count();
    const queryTime = Date.now() - queryStart;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTime: dbTime,
        queryTime,
        documentCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
