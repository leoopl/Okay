'use client';

import * as React from 'react';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';

// --- Tiptap Core Extensions ---
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { Highlight } from '@tiptap/extension-highlight';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Underline } from '@tiptap/extension-underline';

// --- Custom Extensions ---
import { Link } from '@/components/tiptap-extension/link-extension';
import { Selection } from '@/components/tiptap-extension/selection-extension';
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension';

// --- UI Primitives ---
import { Button } from '@/components/tiptap-ui-primitive/button';
import { Spacer } from '@/components/tiptap-ui-primitive/spacer';
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar';

// --- Tiptap Node ---
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension';
import '@/components/tiptap-node/code-block-node/code-block-node.scss';
import '@/components/tiptap-node/list-node/list-node.scss';
import '@/components/tiptap-node/image-node/image-node.scss';
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';

// --- Tiptap UI ---
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu';
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button';
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu';
import { BlockQuoteButton } from '@/components/tiptap-ui/blockquote-button';
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button';
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from '@/components/tiptap-ui/color-highlight-popover';
import { LinkPopover, LinkContent, LinkButton } from '@/components/tiptap-ui/link-popover';
import { MarkButton } from '@/components/tiptap-ui/mark-button';
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button';
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button';

// --- Icons ---
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon';
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon';
import { LinkIcon } from '@/components/tiptap-icons/link-icon';

// --- Hooks ---
import { useMobile } from '@/hooks/use-mobile';
import { useWindowSize } from '@/hooks/use-window-size';
import { useCursorVisibility } from '@/hooks/use-cursor-visibility';

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils';

// Default content for new journals
const DEFAULT_JOURNAL_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: { textAlign: null },
      content: [
        {
          type: 'text',
          text: 'Start writing your thoughts...',
        },
      ],
    },
  ],
};

interface JournalEditorProps {
  /**
   * The initial content as JSON string or JSON object
   */
  content?: string | object;
  /**
   * Callback fired when content changes
   */
  onUpdate?: (content: string) => void;
  /**
   * Whether the editor is editable
   */
  editable?: boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
        <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} />
        <BlockQuoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: 'highlighter' | 'link';
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === 'highlighter' ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === 'highlighter' ? <ColorHighlightPopoverContent /> : <LinkContent />}
  </>
);

export function JournalEditor({
  content,
  onUpdate,
  editable = true,
  placeholder = "Write, type '/' for commands…",
  className = '',
}: JournalEditorProps) {
  const isMobile = useMobile();
  const windowSize = useWindowSize();
  const [mobileView, setMobileView] = React.useState<'main' | 'highlighter' | 'link'>('main');
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  // Parse content to ensure it's a valid JSON object
  const parsedContent = React.useMemo(() => {
    if (!content) {
      return DEFAULT_JOURNAL_CONTENT;
    }

    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (error) {
        console.warn('Invalid JSON content, using default:', error);
        return DEFAULT_JOURNAL_CONTENT;
      }
    }

    return content;
  }, [content]);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': 'Journal content area, start typing to enter text.',
        'data-placeholder': placeholder,
      },
    },
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error('Upload failed:', error),
      }),
      TrailingNode,
      Link.configure({ openOnClick: false }),
    ],
    content: parsedContent,
    onUpdate: ({ editor }) => {
      // Get content as JSON and convert to string
      const jsonContent = editor.getJSON();
      const contentString = JSON.stringify(jsonContent);
      onUpdate?.(contentString);
    },
  });

  const bodyRect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  // Update editor content when prop changes
  React.useEffect(() => {
    if (editor && parsedContent) {
      const currentContent = editor.getJSON();

      // Only update if content is actually different to avoid cursor jumps
      if (JSON.stringify(currentContent) !== JSON.stringify(parsedContent)) {
        editor.commands.setContent(parsedContent, false);
      }
    }
  }, [editor, parsedContent]);

  React.useEffect(() => {
    if (!isMobile && mobileView !== 'main') {
      setMobileView('main');
    }
  }, [isMobile, mobileView]);

  return (
    <div className={`journal-editor ${className}`.trim()}>
      <EditorContext.Provider value={{ editor }}>
        {editable && (
          <Toolbar
            ref={toolbarRef}
            style={
              isMobile
                ? {
                    bottom: `calc(100% - ${windowSize.height - bodyRect.y}px)`,
                  }
                : {}
            }
          >
            {mobileView === 'main' ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView('highlighter')}
                onLinkClick={() => setMobileView('link')}
                isMobile={isMobile}
              />
            ) : (
              <MobileToolbarContent
                type={mobileView === 'highlighter' ? 'highlighter' : 'link'}
                onBack={() => setMobileView('main')}
              />
            )}
          </Toolbar>
        )}

        <div className={`content-wrapper ${!editable ? 'readonly' : ''}`.trim()}>
          <EditorContent editor={editor} role="presentation" className="journal-editor-content" />
        </div>
      </EditorContext.Provider>
    </div>
  );
}

// CSS for the journal editor
const journalEditorStyles = `
.journal-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.journal-editor .content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.journal-editor .content-wrapper.readonly {
  padding: 0;
}

.journal-editor .journal-editor-content {
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
}

.journal-editor .tiptap.ProseMirror {
  outline: none;
  min-height: 200px;
  font-family: "Inter", sans-serif;
}

.journal-editor .content-wrapper::-webkit-scrollbar {
  width: 0.5rem;
}

.journal-editor .content-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.journal-editor .content-wrapper::-webkit-scrollbar-thumb {
  background-color: var(--tt-scrollbar-color);
  border-radius: 4px;
}

.journal-editor .content-wrapper {
  scrollbar-width: thin;
  scrollbar-color: var(--tt-scrollbar-color) transparent;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = journalEditorStyles;
  document.head.appendChild(styleElement);
}
