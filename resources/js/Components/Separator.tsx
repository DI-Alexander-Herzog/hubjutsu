import classNames from "classnames";


type SeparatorType = {
} & React.HTMLAttributes<HTMLHRElement>;

export default function Separator({className,...props} : SeparatorType ) {

    return (
        <hr className={classNames(
            'mt-4 mb-4',
            className
        )}
        {...props} 
        />
    );
}