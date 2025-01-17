export interface Arr {
  [key:string]: any;
}


export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string;
}

export interface Community {
    id: number;
    name: string;
    code: string;
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
  

export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };
    menus: HubjutsuMenus;
};
