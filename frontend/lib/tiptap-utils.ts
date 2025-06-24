import type { Attrs, Node } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/react';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Checks if a mark exists in the editor schema
 * @param markName - The name of the mark to check
 * @param editor - The editor instance
 * @returns boolean indicating if the mark exists in the schema
 */
export const isMarkInSchema = (markName: string, editor: Editor | null): boolean => {
  if (!editor) return false;
  return markName in editor.schema.marks;
};

/**
 * Checks if a node exists in the editor schema
 * @param nodeName - The name of the node to check
 * @param editor - The editor instance
 * @returns boolean indicating if the node exists in the schema
 */
export const isNodeInSchema = (nodeName: string, editor: Editor | null): boolean => {
  if (!editor) return false;
  return nodeName in editor.schema.nodes;
};

/**
 * Gets the active attributes of a specific mark in the current editor selection.
 *
 * @param editor - The Tiptap editor instance.
 * @param markName - The name of the mark to look for (e.g., "highlight", "link").
 * @returns The attributes of the active mark, or `null` if the mark is not active.
 */
export function getActiveMarkAttrs(editor: Editor | null, markName: string): Attrs | null {
  if (!editor || !isMarkInSchema(markName, editor)) {
    return null;
  }

  const mark = editor.getAttributes(markName);
  return mark || null;
}

/**
 * Checks if a node is empty
 */
export function isEmptyNode(node?: Node | null): boolean {
  if (!node) return true;

  // Check if node has content
  if (node.content?.size === 0) return true;

  // Check if content is just whitespace
  const text = node.textContent?.trim();
  return !text || text.length === 0;
}

/**
 * Utility function to conditionally join class names into a single string.
 * Filters out falsey values like false, undefined, null, and empty strings.
 *
 * @param classes - List of class name strings or falsey values.
 * @returns A single space-separated string of valid class names.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Finds the position and instance of a node in the document
 * @param props Object containing editor, node (optional), and nodePos (optional)
 * @param props.editor The TipTap editor instance
 * @param props.node The node to find (optional if nodePos is provided)
 * @param props.nodePos The position of the node to find (optional if node is provided)
 * @returns An object with the position and node, or null if not found
 */
export function findNodePosition(props: {
  editor: Editor | null;
  node?: Node | null;
  nodePos?: number | null;
}): { pos: number; node: Node } | null {
  const { editor, node, nodePos } = props;

  if (!editor) return null;

  if (nodePos !== null && nodePos !== undefined) {
    try {
      const resolvedPos = editor.state.doc.resolve(nodePos);
      return {
        pos: nodePos,
        node: resolvedPos.node(),
      };
    } catch {
      return null;
    }
  }

  if (node) {
    // Find the position of the given node in the document
    let foundPos: number | null = null;

    editor.state.doc.descendants((docNode, pos) => {
      if (docNode === node) {
        foundPos = pos;
        return false; // stop iteration
      }
    });

    if (foundPos !== null) {
      return { pos: foundPos, node };
    }
  }

  return null;
}

/**
 * Handles image upload with progress tracking and abort capability
 * @param file The file to upload
 * @param onProgress Optional callback for tracking upload progress
 * @param abortSignal Optional AbortSignal for cancelling the upload
 * @returns Promise resolving to the URL of the uploaded image
 */
export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
): Promise<string> => {
  // Report initial progress
  onProgress?.({ progress: 0 });

  try {
    // For now, convert to base64 as a fallback
    // In a real implementation, you'd upload to a server or cloud storage
    const base64 = await convertFileToBase64(file, abortSignal);

    // Simulate upload progress
    const simulateProgress = () => {
      return new Promise<void>((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          onProgress?.({ progress });

          if (progress >= 100) {
            clearInterval(interval);
            resolve();
          }
        }, 100);

        // Handle abort
        abortSignal?.addEventListener('abort', () => {
          clearInterval(interval);
          resolve();
        });
      });
    };

    await simulateProgress();

    if (abortSignal?.aborted) {
      throw new Error('Upload cancelled');
    }

    return base64;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Upload failed');
  }
};

/**
 * Converts a File to base64 string
 * @param file The file to convert
 * @param abortSignal Optional AbortSignal for cancelling the conversion
 * @returns Promise resolving to the base64 representation of the file
 */
export const convertFileToBase64 = (file: File, abortSignal?: AbortSignal): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    const abortHandler = () => {
      reader.abort();
      reject(new Error('File reading cancelled'));
    };

    abortSignal?.addEventListener('abort', abortHandler);

    reader.onload = () => {
      abortSignal?.removeEventListener('abort', abortHandler);
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      abortSignal?.removeEventListener('abort', abortHandler);
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Utility functions for TipTap content (moved from server actions)
 */
export function createDefaultTipTapContent() {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

export function validateTipTapContent(content: any): boolean {
  if (!content || typeof content !== 'object') return false;
  if (content.type !== 'doc') return false;
  if (!Array.isArray(content.content)) return false;
  return true;
}

export function extractTextFromTipTapContent(content: any): string {
  if (!content || typeof content !== 'object') return '';

  function extractText(node: any): string {
    if (!node) return '';

    if (node.type === 'text') {
      return node.text || '';
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractText).join('');
    }

    return '';
  }

  return extractText(content);
}
