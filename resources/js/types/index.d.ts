export interface Arr {
  [key:string]: any;
}


export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string;
    avatar: Media;
}

export interface Media {
  [key: string]: any;
}

export interface UseForm {
  errors?: { [key: string]: string };
  data?: { [key: string]: any };
  setData: (data: { [key: string]: any } | any) => void;
}




export interface HubjutsuMenus {
    [key:string]: HubjutsuMenu;
}
  export interface HubjutsuMenu {
    name: string;
    slug: string;
    items?: (HubjutsuMenuItem)[] | null;
    position: string;
  }
  export interface HubjutsuMenuItem {
    title: string;
    route?: (string | (null)[] | null)[] | null;
    active: boolean;
    icon?: null;
    target: string;
    parent?: null;
  }

export interface HubUIData {
    id: number;
    name: string;
    slug: string;
    url: string;
    has_darkmode: boolean;
    enable_registration: boolean;
    enable_guestmode: boolean;
    cssVars: Record<string, string>;
    colors: {
        primary: string;
        primary_text: string;
        secondary: string;
        secondary_text: string;
        tertiary: string;
        tertiary_text: string;
        text: string;
        background: string;
    };
    fonts: {
        sans: string;
        serif: string;
        mono: string;
        header: string;
        text: string;
        import?: string | null; // Optional import field
    };
} 

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
    menus: HubjutsuMenus;
    hub: HubUIData;
};
