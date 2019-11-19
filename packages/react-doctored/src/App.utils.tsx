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

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    switch (node[0]) {
      case NodeTypeEnum.Element: {
        if (
          parents[parents.length - 1] === ParentType.inline ||
          ["NNS", "JJ", "NN"].includes(node[1])
        ) {
          parents.push(ParentType.inline);
          html += `<div class="d-inline"><div class="d-inline__inner"><div class="d-inline__button" role="button" tabindex="0">${node[1]}</div><div class="d-inline__inner__content">`;
        } else {
          parents.push(ParentType.block);
          html += `<div class="d-block"><div class="d-block__button" role="button" tabindex="0">${node[1]}</div><div class="d-block__inner">`;
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
          html += "</div></div></div>";
        } else {
          html += "</div></div>";
        }
      }
    }
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
