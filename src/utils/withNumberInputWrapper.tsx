interface WithNumberInputWrapperProps {
  value?: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  [key: string]: unknown;
}

const WithNumberInputWrapper = (
  Component: React.ComponentType<WithNumberInputWrapperProps>
) => {
  return function (props: WithNumberInputWrapperProps) {
    return <Component {...props} />;
  };
};
export default WithNumberInputWrapper;
