import os
import io
import sys


def main(input_model: str):
    print("Processing: {}".format(input_model))
    from openvino.runtime import Core, PartialShape
    core = Core()
    print("Reading model")
    
    model = core.read_model(input_model)

    input_shapes = {}
    for i in range(2, len(sys.argv), 2):
        input_name = sys.argv[i]
        input_shape = sys.argv[i+1].split(',')
        input_shapes[input_name] = PartialShape(input_shape)

    if len(input_shapes) != 0:
        print("Reshaping model to {}".format(input_shapes))
        model.reshape(input_shapes)

    print("Compiling model")
    core.compile_model(model, "CPU")


if __name__ == "__main__":
    main(sys.argv[1])
