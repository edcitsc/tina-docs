export const GuidedStepTemplate = {
  name: "guidedStep",
  label: "Guided Step",
  ui: {
    defaultItem: {
      stepNumber: 1,
      section: "",
      headingLevel: "h4",
    },
  },
  fields: [
    {
      type: "number",
      name: "stepNumber",
      label: "Step Number",
      description: "The step number displayed in the heading (e.g. Step 1, Step 2)",
      required: true,
    },
    {
      type: "string",
      name: "section",
      label: "Section",
      description:
        "Section identifier used in the heading ID (e.g. 'turn-off' produces id='turn-off-step-1')",
    },
    {
      type: "string",
      name: "headingLevel",
      label: "Heading Level",
      description: "The HTML heading level to render",
      options: [
        { value: "h3", label: "H3" },
        { value: "h4", label: "H4" },
        { value: "h5", label: "H5" },
        { value: "h6", label: "H6" },
      ],
    },
  ],
};

export default GuidedStepTemplate;
