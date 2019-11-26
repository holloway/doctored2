import React from "react";
import { NodeTypes } from "doctored-worker";
import "./App.css";

enum NodeTypeEnum {
  Element = 1,
  Text = 3,
  CloseElement = 20
}

type Props = {
  nodes: NodeTypes[];
};

enum ParentType {
  block,
  inline
}

export default function Nodes({ nodes }: Props): React.ReactElement {
  let html = "";

  const parents: ParentType[] = [];

  function isInline(nodeName: string) {
    return (
      parents[parents.length - 1] === ParentType.inline ||
      ["a", "span", "link"].includes(nodeName)
    );
  }

  console.log(nodes);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    switch (node[0]) {
      case NodeTypeEnum.Element: {
        if (isInline(node[1])) {
          parents.push(ParentType.inline);
          html += `<div class="d-inline">`;
          html += `<div class="d-inline__inner">`;
          html += `<div class="d-inline__button" role="button" tabindex="0">`;
          html += node[1];
          html += `</div>`;
          html += `<div class="d-inline__inner__content">`;
        } else {
          parents.push(ParentType.block);
          html += `<div class="d-block">`;
          html += `<div class="d-block__button" role="button" tabindex="0">`;
          html += node[1];
          html += `</div>`;
          html += `<div class="d-block__inner">`;
        }
        break;
      }
      case NodeTypeEnum.Text: {
        html += `<span contentEditable>${node[1]}</span>`;
        break;
      }
      case NodeTypeEnum.CloseElement: {
        const closing = parents.pop();
        if (closing === ParentType.inline) {
          html += `</div>`;
          html += `</div>`;
          html += `</div>`;
        } else {
          html += `</div>`;
          html += `</div>`;
        }
      }
    }
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
