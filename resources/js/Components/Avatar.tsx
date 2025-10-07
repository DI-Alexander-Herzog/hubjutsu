import { User } from "@/types";
import classNames from "classnames";

export default function Avatar({user, className="", inline=false}:{user: User, className?: string, inline?: boolean}) {

    let avatar = <>{(user.name || user.email)[0]}</>;
    if (user.avatar) {
        avatar = <img className="object-contain w-100 aspect-square" src={user.avatar.thumbnail} />
    }

    const style = {"width": "100%", "height": "100%", "overflow": "hidden", "marginTop": "0", "marginBottom": "0"};
    if (inline) {
        style["marginTop"] = "-0.5em";
        style["marginBottom"] = "-0.5em";
    }

    return (
        <div className={ classNames(" rounded-full overflow-hidden flex justify-center text-center", className) } >
            <div className=" align-items-center text-center justify-content-center  bg-primary  border-circle" style={style}>
                {avatar}
            </div>
        </div>
    );
}
