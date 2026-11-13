export function OpenCodeLogo(props: { class?: string }) {
  return (
    <span
      class={`inline-flex size-5 items-center justify-center rounded-[5px] bg-v2-background-bg-accent text-[10px] font-semibold text-v2-text-text-inverse ${props.class ?? ""}`}
      data-component="codeai-provider-logo"
      aria-hidden="true"
    >
      C/
    </span>
  )
}
