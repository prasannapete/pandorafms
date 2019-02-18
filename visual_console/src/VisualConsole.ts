import { UnknownObject, Size } from "./types";
import { parseBoolean, sizePropsDecoder, parseIntOr } from "./lib";
import VisualConsoleItem, {
  VisualConsoleItemProps,
  VisualConsoleItemType
} from "./VisualConsoleItem";
import StaticGraph, { staticGraphPropsDecoder } from "./items/StaticGraph";
import Icon, { iconPropsDecoder } from "./items/Icon";
import ColorCloud, { colorCloudPropsDecoder } from "./items/ColorCloud";
import Group, { groupPropsDecoder } from "./items/Group";

// Base properties.
export interface VisualConsoleProps extends Size {
  readonly id: number;
  name: string;
  groupId: number;
  backgroundURL: string | null; // URL?
  backgroundColor: string | null;
  isFavorite: boolean;
}

/**
 * Build a valid typed object from a raw object.
 * This will allow us to ensure the type safety.
 *
 * @param data Raw object.
 * @return An object representing the Visual Console props.
 * @throws Will throw a TypeError if some property
 * is missing from the raw object or have an invalid type.
 */
export function visualConsolePropsDecoder(
  data: UnknownObject
): VisualConsoleProps | never {
  // Object destructuring: http://es6-features.org/#ObjectMatchingShorthandNotation
  const {
    id,
    name,
    groupId,
    backgroundURL,
    backgroundColor,
    isFavorite
  } = data;

  if (id == null || isNaN(parseInt(id))) {
    throw new TypeError("invalid Id.");
  }
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError("invalid name.");
  }
  if (groupId == null || isNaN(parseInt(groupId))) {
    throw new TypeError("invalid group Id.");
  }

  return {
    id: parseInt(id),
    name,
    groupId: parseInt(groupId),
    backgroundURL:
      typeof backgroundURL === "string" && backgroundURL.length > 0
        ? backgroundURL
        : null,
    backgroundColor:
      typeof backgroundColor === "string" && backgroundColor.length > 0
        ? backgroundColor
        : null,
    isFavorite: parseBoolean(isFavorite),
    ...sizePropsDecoder(data)
  };
}

// TODO: Document.
function itemInstanceFrom(data: UnknownObject) {
  const type = parseIntOr(data.type, null);
  if (type == null) throw new TypeError("missing item type.");

  switch (<VisualConsoleItemType>type) {
    case VisualConsoleItemType.STATIC_GRAPH:
      return new StaticGraph(staticGraphPropsDecoder(data));
    case VisualConsoleItemType.MODULE_GRAPH:
      throw new TypeError("item not found");
    case VisualConsoleItemType.SIMPLE_VALUE:
      throw new TypeError("item not found");
    case VisualConsoleItemType.PERCENTILE_BAR:
      throw new TypeError("item not found");
    case VisualConsoleItemType.LABEL:
      throw new TypeError("item not found");
    case VisualConsoleItemType.ICON:
      return new Icon(iconPropsDecoder(data));
    case VisualConsoleItemType.SIMPLE_VALUE_MAX:
      throw new TypeError("item not found");
    case VisualConsoleItemType.SIMPLE_VALUE_MIN:
      throw new TypeError("item not found");
    case VisualConsoleItemType.SIMPLE_VALUE_AVG:
      throw new TypeError("item not found");
    case VisualConsoleItemType.PERCENTILE_BUBBLE:
      throw new TypeError("item not found");
    case VisualConsoleItemType.SERVICE:
      throw new TypeError("item not found");
    case VisualConsoleItemType.GROUP_ITEM:
      return new Group(groupPropsDecoder(data));
    case VisualConsoleItemType.BOX_ITEM:
      throw new TypeError("item not found");
    case VisualConsoleItemType.LINE_ITEM:
      throw new TypeError("item not found");
    case VisualConsoleItemType.AUTO_SLA_GRAPH:
      throw new TypeError("item not found");
    case VisualConsoleItemType.CIRCULAR_PROGRESS_BAR:
      throw new TypeError("item not found");
    case VisualConsoleItemType.CIRCULAR_INTERIOR_PROGRESS_BAR:
      throw new TypeError("item not found");
    case VisualConsoleItemType.DONUT_GRAPH:
      throw new TypeError("item not found");
    case VisualConsoleItemType.BARS_GRAPH:
      throw new TypeError("item not found");
    case VisualConsoleItemType.CLOCK:
      throw new TypeError("item not found");
    case VisualConsoleItemType.COLOR_CLOUD:
      return new ColorCloud(colorCloudPropsDecoder(data));
    default:
      throw new TypeError("item not found");
  }
}

export default class VisualConsole {
  // Reference to the DOM element which will contain the items.
  private readonly containerRef: HTMLElement;
  // Properties.
  private _props: VisualConsoleProps;
  // Visual Console Item instances.
  private elements: VisualConsoleItem<VisualConsoleItemProps>[] = [];

  constructor(
    container: HTMLElement,
    props: VisualConsoleProps,
    items: UnknownObject[]
  ) {
    this.containerRef = container;
    this._props = props;

    // Force the first render.
    this.render();

    // TODO: Document.
    items.forEach(item => {
      try {
        const itemInstance = itemInstanceFrom(item);
        this.elements.push(itemInstance);
        itemInstance.onClick(e =>
          console.log(`Clicked element #${e.data.id}`, e)
        );
        this.containerRef.append(itemInstance.elementRef);
      } catch (error) {
        console.log("Error creating a new element:", error.message);
      }
    });

    // Sort by isOnTop, id ASC
    this.elements.sort(function(a, b) {
      if (a.props.isOnTop && !b.props.isOnTop) return 1;
      else if (!a.props.isOnTop && b.props.isOnTop) return -1;
      else if (a.props.id < b.props.id) return 1;
      else return -1;
    });
  }

  /**
   * Public accessor of the `props` property.
   * @return Properties.
   */
  get props(): VisualConsoleProps {
    return this._props;
  }

  /**
   * Public setter of the `props` property.
   * If the new props are different enough than the
   * stored props, a render would be fired.
   * @param newProps
   */
  set props(newProps: VisualConsoleProps) {
    const prevProps = this.props;
    // Update the internal props.
    this._props = newProps;

    // From this point, things which rely on this.props can access to the changes.

    // Re-render.
    this.render(prevProps);
  }

  /**
   * Recreate or update the HTMLElement which represents the Visual Console into the DOM.
   * @param prevProps If exists it will be used to only DOM updates instead of a full replace.
   */
  render(prevProps: VisualConsoleProps | null = null): void {
    if (prevProps) {
      if (prevProps.backgroundURL !== this.props.backgroundURL) {
        this.containerRef.style.backgroundImage = this.props.backgroundURL;
      }
      if (prevProps.backgroundColor !== this.props.backgroundColor) {
        this.containerRef.style.backgroundColor = this.props.backgroundColor;
      }
      if (this.sizeChanged(prevProps, this.props)) {
        this.resizeElement(this.props.width, this.props.height);
      }
    } else {
      this.containerRef.style.backgroundImage = this.props.backgroundURL;
      this.containerRef.style.backgroundColor = this.props.backgroundColor;
      this.resizeElement(this.props.width, this.props.height);
    }
  }

  /**
   * Compare the previous and the new size and return
   * a boolean value in case the size changed.
   * @param prevSize
   * @param newSize
   * @return Whether the size changed or not.
   */
  sizeChanged(prevSize: Size, newSize: Size): boolean {
    return (
      prevSize.width !== newSize.width || prevSize.height !== newSize.height
    );
  }

  /**
   * Resize the DOM container.
   * @param width
   * @param height
   */
  resizeElement(width: number, height: number): void {
    this.containerRef.style.width = `${width}px`;
    this.containerRef.style.height = `${height}px`;
  }

  /**
   * Update the size into the properties and resize the DOM container.
   * @param width
   * @param height
   */
  resize(width: number, height: number): void {
    this.props = {
      ...this.props, // Object spread: http://es6-features.org/#SpreadOperator
      width,
      height
    };
  }

  /**
   * To remove the event listeners and the elements from the DOM.
   */
  remove(): void {
    this.elements.forEach(e => e.remove()); // Arrow function.
    this.elements = [];
  }
}
