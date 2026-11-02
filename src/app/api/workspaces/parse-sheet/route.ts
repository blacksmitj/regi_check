import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchAndParseGoogleSheet } from "@/lib/sheets/google-sheets";

/**
 * POST /api/workspaces/parse-sheet
 * Takes { url: string } and returns parsed headers and preview rows
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL Google Spreadsheet wajib diisi." },
        { status: 400 }
      );
    }

    const result = await fetchAndParseGoogleSheet(url);

    return NextResponse.json({
      spreadsheetId: result.spreadsheetId,
      sheetGid: result.sheetGid,
      exportUrl: result.exportUrl,
      headers: result.headers,
      totalRows: result.rows.length,
      previewRows: result.rows.slice(0, 5),
    });
  } catch (error: any) {
    console.error("POST /api/workspaces/parse-sheet error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal memproses spreadsheet." },
      { status: 400 }
    );
  }
}
