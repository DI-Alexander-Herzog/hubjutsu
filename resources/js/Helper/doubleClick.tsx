
type ClickHandler = (event: React.MouseEvent) => void;

let clickTimeout: NodeJS.Timeout | null = null;

export function handleDoubleClick(onClick: ClickHandler, onDoubleClick: ClickHandler, delay = 200) {
  return (event: React.MouseEvent) => {
    if (clickTimeout !== null) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      onDoubleClick(event);
    } else {
      clickTimeout = setTimeout(() => {
        onClick(event);
        clickTimeout = null;
      }, delay);
    }
  };
}
