import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Card, Heading, UploadPanel } from "@/components/ui";

describe("research UI primitives", () => {
  it("renders the heading and its description", () => {
    render(<Heading title="Paper library" description="Manage indexed studies." />);
    expect(screen.getByRole("heading", { name: "Paper library" })).toBeInTheDocument();
    expect(screen.getByText("Manage indexed studies.")).toBeInTheDocument();
  });
  it("keeps card content visible", () => {
    render(<Card>Upload a research paper</Card>);
    expect(screen.getByText("Upload a research paper")).toBeInTheDocument();
  });
  afterEach(() => vi.unstubAllGlobals());
  it("submits a selected PDF and reports that indexing started", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ papers: [{ filename: "study.pdf", status: "processing", duplicate: false }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const onDone = vi.fn();
    render(<UploadPanel onDone={onDone} />);
    const file = new File(["%PDF-1.7"], "study.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Browse files"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload and index" }));
    await waitFor(() => expect(screen.getByText(/study.pdf: received; extraction and indexing continue/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledOnce();
  });
});
