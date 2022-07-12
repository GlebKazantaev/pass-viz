import os
import sys
import pickle
import subprocess


def collect(input_model: str, run_name: str, model_name: str, input_shapes = []):
    os.environ['NGRAPH_ENABLE_PASS_TRACKING'] = '1'
    os.environ['NGRAPH_PASS_TRACKING_RUN_NAME'] = run_name
    os.environ['NGRAPH_PASS_TRACKING_MODEL_NAME'] = model_name
    os.environ['NGRAPH_PASS_TRACKING_OUTPUT_DIR'] = '/Users/gleb_dmitrievich/Work/repos/pass-viz/backend/dump'

    print(sys.executable)
    out = subprocess.call([sys.executable, '/Users/gleb_dmitrievich/Work/repos/pass-viz/backend/ov.py', input_model, *input_shapes], env=os.environ)

if __name__ == "__main__":
    run_name = sys.argv[1]
    print("Start compiling models...")

    collect("/Users/gleb_dmitrievich/Downloads/tinyyolov2-8.onnx", run_name, "yolo_v2", [
        'image', "1,3,416,416"
    ])

    collect("/Users/gleb_dmitrievich/Downloads/squeezenet1.1-7.onnx", run_name, "squeezenet_1.1")

    # collect("/Users/gleb_dmitrievich/Downloads/resnet50-v1-7.onnx", run_name, "resnet50_v1", [
    #     'data', "1,3,224,224"
    # ])

    # collect("/Users/gleb_dmitrievich/Downloads/mobilenetv2-7.onnx", run_name, "mobilenet")
    # collect("/Users/gleb_dmitrievich/Downloads/squeezenet1.1-7.onnx", run_name, "squeezenet")
    print("All models were processed!")
    
