/**
 * MarkdownContent - Renders markdown with syntax highlighting
 * Supports GitHub Flavored Markdown (tables, strikethrough, etc.)
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`markdown-content ${className}`}
      components={{
        // Code blocks
        code: ({ node, inline, className, children, ...props }: any) => {
          return inline ? (
            <code
              className="px-1.5 py-0.5 bg-gray-700/50 text-blue-300 rounded text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          ) : (
            <pre className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 overflow-x-auto my-3">
              <code className="text-sm font-mono text-gray-200" {...props}>
                {children}
              </code>
            </pre>
          );
        },
        // Links
        a: ({ children, href, ...props }: any) => (
          <a
            href={href}
            className="text-blue-400 hover:text-blue-300 underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        // Headings
        h1: ({ children, ...props }: any) => (
          <h1 className="text-2xl font-bold mt-4 mb-2 text-gray-100" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }: any) => (
          <h2 className="text-xl font-bold mt-4 mb-2 text-gray-100" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }: any) => (
          <h3 className="text-lg font-bold mt-3 mb-2 text-gray-100" {...props}>
            {children}
          </h3>
        ),
        h4: ({ children, ...props }: any) => (
          <h4 className="text-base font-bold mt-3 mb-2 text-gray-100" {...props}>
            {children}
          </h4>
        ),
        h5: ({ children, ...props }: any) => (
          <h5 className="text-sm font-bold mt-2 mb-1 text-gray-100" {...props}>
            {children}
          </h5>
        ),
        h6: ({ children, ...props }: any) => (
          <h6 className="text-xs font-bold mt-2 mb-1 text-gray-100" {...props}>
            {children}
          </h6>
        ),
        // Lists
        ul: ({ children, ...props }: any) => (
          <ul className="list-disc list-inside my-2 space-y-1" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }: any) => (
          <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }: any) => (
          <li className="text-gray-200" {...props}>
            {children}
          </li>
        ),
        // Blockquote
        blockquote: ({ children, ...props }: any) => (
          <blockquote
            className="border-l-4 border-gray-600 pl-4 my-3 italic text-gray-400"
            {...props}
          >
            {children}
          </blockquote>
        ),
        // Tables
        table: ({ children, ...props }: any) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border border-gray-700" {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }: any) => (
          <thead className="bg-gray-800" {...props}>
            {children}
          </thead>
        ),
        tbody: ({ children, ...props }: any) => (
          <tbody className="divide-y divide-gray-700" {...props}>
            {children}
          </tbody>
        ),
        tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
        th: ({ children, ...props }: any) => (
          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-200" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }: any) => (
          <td className="px-4 py-2 text-sm text-gray-300" {...props}>
            {children}
          </td>
        ),
        // Horizontal rule
        hr: ({ ...props }: any) => <hr className="my-4 border-gray-700" {...props} />,
        // Paragraphs
        p: ({ children, ...props }: any) => (
          <p className="my-2 leading-relaxed text-gray-200" {...props}>
            {children}
          </p>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
