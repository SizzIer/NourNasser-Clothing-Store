interface WithSelectInputWrapperProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  [key: string]: unknown;
}

const WithSelectInputWrapper = (
  Component: React.ComponentType<WithSelectInputWrapperProps>
) => {
  return function (props: WithSelectInputWrapperProps) {
    return <Component {...props} />;
  };
};
export default WithSelectInputWrapper;
