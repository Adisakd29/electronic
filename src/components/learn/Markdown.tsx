/**
 * Markdown renderer for every `Md` string (GFM + KaTeX math).
 * Server- and client-safe (no hooks). Raw HTML in markdown is ignored;
 * unsafe URLs are stripped by react-markdown's default urlTransform.
 *
 *   <Markdown>{md}</Markdown>            block prose (paragraphs, lists, tables)
 *   <Markdown inline>{md}</Markdown>     inside buttons/labels: no <p> wrappers
 */
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import katex from "katex";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins: NonNullable<Parameters<typeof ReactMarkdown>[0]["rehypePlugins"]> = [
  [rehypeKatex, { strict: "ignore", throwOnError: false }],
];

function isExternal(href?: string) {
  return !!href && /^https?:\/\//i.test(href);
}

const blockComponents: Components = {
  a: ({ href, children, node, ...rest }) => {
    void node;
    return isExternal(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
        <span className="sr-only"> (เปิดในแท็บใหม่)</span>
      </a>
    ) : (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
  table: ({ children, node, ...rest }) => {
    void node;
    return (
      <div className="my-4 overflow-x-auto rounded-sm border border-line">
        <table {...rest} className="my-0! min-w-[480px] [&_td]:border-x-0 [&_th]:border-x-0 [&_tr:last-child_td]:border-b-0">
          {children}
        </table>
      </div>
    );
  },
  img: () => null, // content never embeds remote images; figures use FigureRef
};

const inlineComponents: Components = {
  ...blockComponents,
  p: ({ children }) => <Fragment>{children}</Fragment>,
};

export function Markdown({ children, inline = false, className }: { children: string | null | undefined; inline?: boolean; className?: string }) {
  if (!children) return null;
  if (inline) {
    return (
      <span className={cn("md-inline", className)}>
        <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={inlineComponents}>
          {children}
        </ReactMarkdown>
      </span>
    );
  }
  return (
    <div className={cn("prose-lesson", className)}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={blockComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Render a KaTeX expression (no surrounding $). */
export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
  return display ? (
    <div className={cn("katex-block overflow-x-auto", className)} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export default Markdown;
