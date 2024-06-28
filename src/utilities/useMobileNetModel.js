import {useCallback, useState} from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import useSnackBar from "./useSnackBar";
import retry from "./retryFunction";
import useIndexedDB from "./useIndexedDB";

const useMobileNetModel = () => {
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(null);
  const [classifier, setClassifier] = useState(null);

  const {
    handleClose,
    open,
    setOpen,
    snackBarMessage,
    setSnackBarMessage
  } = useSnackBar();

  const {checkIDBforSavedClassifier, saveModel, deleteModel} = useIndexedDB();

  const createNewClassifier = useCallback(async () => {
    try {
      const knnclassifier = await knnClassifier.create();
      setClassifier(knnclassifier);
      saveModel("classifier_model", knnclassifier);
    } catch (error) {
    }
  }, []);

  const loadClassifierFromIndexedDB = useCallback(async () => {
    debugger

    const savedClassifier = await checkIDBforSavedClassifier(
      "classifier_model"
    );
    debugger

    if (savedClassifier) {
      // console.log("Successfully loaded a saved classifier", savedClassifier);
      setClassifier(savedClassifier);
    } else {
      // console.log(
      //   `Error: No saved classifier in IndexedDB found. Creating a new classifier...`
      // );
      createNewClassifier();
    }
  }, []);

  const createClassifier = useCallback(async () => {
    if ("indexedDB" in window) {
      debugger

      loadClassifierFromIndexedDB();
    } else {
      console.warn(
        "IndexedDB is not supported. Model and KNN Classifier will not save"
      );
      createNewClassifier();
    }
  }, []);

  const loadModel = useCallback(async () => {
    await tf.ready();
    try {
      const model = await retry(mobilenet.load, 3, 2);
      setModel(model);
      setSnackBarMessage(`Model loaded!`);
      setIsLoadingModel(false);
    } catch (error) {
      setSnackBarMessage("Error loading model. Please refresh and try again.");
    }
    setOpen(true);
  }, [setOpen, setSnackBarMessage]);

  const checkClassifier = async image => {
    debugger

    const activation = model.infer(image, "conv_preds");
    const result = await classifier.predictClass(activation);
    if (result.confidences[result.label] < 1) {
      alert("Please train me, i dont know what is it!!!");
      setIsLoading(false);
      setPredictions([]);
      setOpen(true);
      return true;
    }
    // if (result.confidences[result.label] === 1) {
    //   alert("You teached me, i know what is !!!");
    //   setIsLoading(false);
    //   let predictions = [];
    //
    //   for (const label in result.confidences) {
    //     if (result.confidences[label] >= 0.25) {
    //       predictions.push({
    //         className: `${label}`,
    //         probability: result.confidences[label]
    //       });
    //     }
    //     setOpen(true);
    //     setPredictions(predictions);
    //     return false;
    //   }
    // }
    if (result.confidences[result.label] >= 0.5) {
      let predictions = [];
      for (const label in result.confidences) {
        if (result.confidences[label] >= 0.25) {
          predictions.push({
            className: `${label}`,
            probability: result.confidences[label]
          });
        }
      }
      predictions = predictions.sort((a, b) => b.probability - a.probability);
      setIsLoading(false);
      setPredictions(predictions);
      setSnackBarMessage(
        "You've shown me something similar before...But can you label it to help me remember?"
      );
      setOpen(true);
      return true;
    }
    setIsLoading(false);
    setPredictions([]);
    setSnackBarMessage("I'm not sure what that is! Can you train me?");
    setOpen(true);
    return false;
  };

  const makePrediction = async (image, imageURL) => {
    debugger

    if (imageURL === null) {
      setSnackBarMessage("Take another picture please");
      setOpen(true);
      return;
    }
    setIsLoading(true);
    if (classifier.getNumClasses() > 0) {
      const isTrained = await checkClassifier(image);
      if (isTrained) {
        return;
      }
    }
    debugger

    if (classifier.getNumClasses() === 0) {
      alert(
        "Please train me, i dont know what is, you never trained before !!!... you want see similar ?"
      );
      setIsLoading(false);
    }

    // SIMILAR ------------------- TODO
    // else use model to classify
    // try {
    //   const predictions = await model.classify(image, 5);
    //   setIsLoading(false);
    //   setPredictions(predictions);
    //   setSnackBarMessage(
    //     "Experience tells me these are possibilities, but if you disagree, you can train me to learn what you think it is..."
    //   );
    // } catch (err) {
    //   setSnackBarMessage(
    //     "No predictions can be made. Take another picture. Check out the tips"
    //   );
    //   console.error("error:", err);
    // }
    // setOpen(true);
  };

  const deleteClassifier = async () => {
    await deleteModel();

    if (classifier) {
      classifier.clearAllClasses();
      classifier.dispose();
    }
    createClassifier();
  };

  return {
    model,
    loadModel,
    createClassifier,
    classifier,
    snackBarMessage,
    open,
    handleClose,
    isLoadingModel,
    setIsLoadingModel,
    predictions,
    setPredictions,
    isLoading,
    setIsLoading,
    makePrediction,
    deleteClassifier
  };
};

export default useMobileNetModel;
