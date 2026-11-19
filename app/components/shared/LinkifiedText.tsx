import { Fragment } from "react";

const URL_REGEX = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

interface LinkifiedTextProps {
  text: string;
  linkClassName?: string;
}

export default function LinkifiedText({ text, linkClassName }: LinkifiedTextProps) {
  const parts = text.split(URL_REGEX);

  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;

        const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? "";
        const url = trailing ? part.slice(0, -trailing.length) : part;
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;

        return (
          <Fragment key={index}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              {url}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}