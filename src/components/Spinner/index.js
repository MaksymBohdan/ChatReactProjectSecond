import React from 'react';
import { Loader, Dimmer } from 'semantic-ui-react'

const Spinner = () => {
  return (
    <Dimmer active> {/*to provide dark background*/}
      <Loader size="huge" content={'Preparing Chat...'} />
    </Dimmer>
  )
};

export default Spinner;