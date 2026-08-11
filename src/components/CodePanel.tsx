import { useEffect, useRef } from "react";
import { python } from "@codemirror/lang-python";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  type DecorationSet,
} from "@codemirror/view";

const setActiveLine = StateEffect.define<number | null>();

/** Highlights the currently-executing source line (docs/18 — current line highlight). */
function activeLineField(): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(deco, tr) {
      deco = deco.map(tr.changes);
      for (const effect of tr.effects) {
        if (!effect.is(setActiveLine)) continue;
        const line = effect.value;
        if (line == null) return Decoration.none;
        const lineBlock = tr.state.doc.line(Math.min(line, tr.state.doc.lines));
        deco = Decoration.set([
          Decoration.line({ class: "cm-ca-active" }).range(lineBlock.from),
        ]);
      }
      return deco;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}

export function CodePanel({
  code,
  activeLine,
  readOnly = false,
  onCodeChange,
}: {
  code: string;
  activeLine: number | null;
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onCodeChangeRef = useRef(onCodeChange);
  onCodeChangeRef.current = onCodeChange;

  // (Re)create the editor when the example changes.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          python(),
          activeLineField(),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.lineWrapping,
          EditorView.theme({
            "&": { height: "100%", fontSize: "13px" },
            ".cm-scroller": { overflow: "auto" },
            ".cm-line": { padding: "0 14px" },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && onCodeChangeRef.current) {
              onCodeChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: host,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [code, readOnly]);

  // Move the highlight whenever the current step changes.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setActiveLine.of(activeLine ?? null) });
  }, [activeLine]);

  return <div ref={hostRef} className="h-full overflow-hidden" />;
}
