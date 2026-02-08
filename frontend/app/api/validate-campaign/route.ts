import { NextRequest, NextResponse } from "next/server";
import {
  runFullValidation,
  type EmailSequence,
  type Lead,
  type ValidationResult,
} from "@/lib/validation";

interface ValidateCampaignRequest {
  campaignId: string;
  platform: "bison" | "instantly" | string;
  emailSequence: EmailSequence[];
  leadList: Lead[];
  icpDescription: string;
  strategistNotes?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "Server configuration error",
          message: "ANTHROPIC_API_KEY is not configured",
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: ValidateCampaignRequest = await request.json();

    // Validate required fields
    const requiredFields = [
      "campaignId",
      "platform",
      "emailSequence",
      "leadList",
      "icpDescription",
    ];
    const missingFields = requiredFields.filter(
      (field) => !(field in body) || body[field as keyof ValidateCampaignRequest] === undefined
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `Missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate email sequence
    if (!Array.isArray(body.emailSequence) || body.emailSequence.length === 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "emailSequence must be a non-empty array",
        },
        { status: 400 }
      );
    }

    // Validate lead list
    if (!Array.isArray(body.leadList) || body.leadList.length === 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "leadList must be a non-empty array",
        },
        { status: 400 }
      );
    }

    // Run validation
    const result: ValidationResult = await runFullValidation(
      body.emailSequence,
      body.leadList,
      body.icpDescription,
      body.strategistNotes || ""
    );

    // Return results with campaign metadata
    return NextResponse.json({
      success: true,
      campaignId: body.campaignId,
      platform: body.platform,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Campaign validation error:", error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid JSON",
          message: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          error: "Configuration error",
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/validate-campaign",
    methods: ["POST"],
    requiredFields: [
      "campaignId",
      "platform",
      "emailSequence",
      "leadList",
      "icpDescription",
    ],
    optionalFields: ["strategistNotes"],
    configured: !!process.env.ANTHROPIC_API_KEY,
  });
}
