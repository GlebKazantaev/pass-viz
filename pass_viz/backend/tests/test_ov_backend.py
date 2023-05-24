import os
import pytest

from openvino.runtime import PartialShape


class PassVizProfile(object):
    def __init__(self, run_name: str, model_name: str, output_dir='/tmp/pass_viz', backend=None):
        self._run_name = run_name
        self._model_name = model_name
        self._output_dir = output_dir

    def __enter__(self):
        print("PassVisProfile.__enter__")
        os.environ['NGRAPH_ENABLE_PASS_TRACKING'] = '1'
        os.environ['NGRAPH_PASS_TRACKING_RUN_NAME'] = self._run_name
        os.environ['NGRAPH_PASS_TRACKING_MODEL_NAME'] = self._model_name
        os.environ['NGRAPH_PASS_TRACKING_OUTPUT_DIR'] = self._output_dir

    def __exit__(self, type, value, traceback):
        print("PassVisProfile.__exit__")
        print(traceback)

        del os.environ['NGRAPH_ENABLE_PASS_TRACKING']
        del os.environ['NGRAPH_PASS_TRACKING_RUN_NAME']
        del os.environ['NGRAPH_PASS_TRACKING_MODEL_NAME']
        del os.environ['NGRAPH_PASS_TRACKING_OUTPUT_DIR']

        return True


@pytest.mark.parametrize(
    "input_model,input_shapes,run_name,model_name",
    [
        (
            "/Users/gleb_dmitrievich/Downloads/tinyyolov2-8.onnx",
            {
                "image": PartialShape([ 1, 3, 416, 416])
            },
            "static_shape",
            "tinyyolov2",
        ),
        (
            "/Users/gleb_dmitrievich/Downloads/tinyyolov2-8.onnx",
            {
                "image": PartialShape([-1, 3, 416, 416])
            },
            "dynamic_shape",
            "tinyyolov2",
        ),
        (
                "/Users/gleb_dmitrievich/Downloads/inception-v1-9.onnx",
                {
                    "data_0": PartialShape([1,3,224,224])
                },
                "static_shape",
                "inception_v1",
        ),
        (
                "/Users/gleb_dmitrievich/Downloads/inception-v1-9.onnx",
                {
                    "data_0": PartialShape([-1,3,224,224])
                },
                "dynamic_shape",
                "inception_v1",
        ),
        (
             "/Users/gleb_dmitrievich/Downloads/tiny-yolov3-11.onnx",
             {
                 "input_1": PartialShape([1, 3, 224, 224])
             },
             "static_shape",
             "tiny_yolov3_11",
        ),
        (
             "/Users/gleb_dmitrievich/Downloads/tiny-yolov3-11.onnx",
             {
                 "input_1": PartialShape([-1, 3, 224, 224])
             },
             "dynamic_shape",
             "tiny_yolov3_11",
        ),
    ]
)
def test_model(input_model, input_shapes, run_name, model_name):
    from openvino.runtime import Core

    core = Core()
    model = core.read_model(input_model)

    with PassVizProfile(run_name=run_name, model_name=model_name, output_dir="/tmp/new"):
        model.reshape(input_shapes)
        core.compile_model(model, "CPU")
